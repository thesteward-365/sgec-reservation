# 역방향 프록시 환경에서의 리다이렉트 포트(3000) 노출 문제 해결 기록

Next.js 예약 시스템 배포 과정에서, 외부 역방향 프록시(External Proxy) 환경 하에 접속할 때 로그인 페이지 등으로 리다이렉트될 때 내부 포트 번호(:3000)가 도메인 주소에 달라붙는 문제를 해결한 과정에 대한 기록이다.

---

## 1. 발생한 문제

배포 후 외부 인터넷망을 통해 `https://yeyak.example.or.kr` (루트 경로)로 접속 시 리다이렉션 과정에서 내부 포트가 노출되는 현상이 발생했다.

- **포트 3000 노출 현상**:
  사용자가 HTTPS 표준 포트(443)로 정상 접속했으나 로그인 화면 등으로 리다이렉트되는 과정에서 브라우저 주소창에 강제로 `https://yeyak.example.or.kr:3000/login`과 같이 내부 포트(`:3000`)가 도메인 주소에 달라붙는 오류가 발생했다. 외부 포트 3000번은 방화벽 등으로 닫혀 있으므로 이 시점부터 사용자는 서비스 접속에 실패하게 되었다.

---

## 2. 원인 분석

이 문제는 외부 역방향 프록시 장비가 HTTP `Host` 헤더를 다루는 방식과 Next.js가 리다이렉트 절대 경로를 생성하는 방식 간의 한계 때문에 발생했다.

### 2-1. 포트 `:3000`이 주소창에 나타난 이유

일반적인 간이 역방향 프록시는 외부 요청(`https://yeyak.example.or.kr`)을 수신하여 내부 서비스(`http://localhost:3000`)로 중계할 때, 내부 포트에 맞춰 `Host` 헤더를 `도메인:3000` 또는 `localhost:3000`으로 변조하여 백엔드로 전달한다.

이때 Next.js 내장 리다이렉션 로직이 표준 `request.url` 혹은 오염된 `Host` 헤더를 사용하여 절대 경로를 만들게 되면서, 리다이렉트 대상 주소에 `:3000`이 포함되었던 것이다.

---

## 3. 해결 방법

인프라와 애플리케이션의 결합도를 낮추기 위해 **도커 멀티 컨테이너 아키텍처**를 적용하고, 변조가 불가능한 **커스텀 보안 헤더**를 통해 Next.js가 올바른 도메인 주소로 절대 경로 리다이렉션을 계산하도록 설계했다.

### 3-1. 1컨테이너 1프로세스 원칙 준수 (Nginx Proxy 컨테이너 분리)

Next.js가 내부 환경에 직접 노출되지 않도록 `docker-compose.yml`을 기반으로 최전선에 Nginx 컨테이너를 배치했다.

- **Next.js 격리**: `expose: - '3000'` 처리하여 오직 도커 내부망에서만 통신할 수 있게 격리하고, 호스트 3000번 포트에는 직접 접근할 수 없게 설계했다.
- **Nginx 프록시 기동**: `nginx:alpine` 이미지를 서비스로 정의하여 호스트의 `3000:3000` 포트를 매핑하고, 최전선에서 모든 외부 접속을 수신하게 한다.

### 3-2. 커스텀 보안 헤더를 활용한 위조 방지 (`x-nginx-*`)

Nginx 설정([nginx.conf](file:///Users/jeong-yeonhui/projects/sgec-reservation/nginx.conf)) 내에서 외부 클라이언트가 임의로 가공하여 보낸 `X-Forwarded-*` 헤더를 덮어쓰고 검증된 값을 안전하게 래핑한다.

```nginx
# nginx.conf 예시
map $http_x_forwarded_proto $forwarded_proto {
    default $http_x_forwarded_proto;
    ''      $scheme;
}

map $http_x_forwarded_host $forwarded_host {
    default $http_x_forwarded_host;
    ''      $http_host;
}

server {
    listen 3000;
    location / {
        proxy_pass http://app:3000;

        # 외부 클라이언트의 스푸핑을 차단하고 Next.js로 전달할 전용 보안 헤더 세팅
        proxy_set_header x-nginx-proto $forwarded_proto;
        proxy_set_header x-nginx-host $forwarded_host;
    }
}
```

### 3-3. Next.js 절대 리다이렉트 경로 연동 (`src/proxy.ts` 및 로그아웃 라우트)

Next.js 미들웨어와 API 단에서는 더 이상 오염된 `Host` 헤더를 타지 않고, Nginx가 보장해 준 신뢰할 수 있는 `x-nginx-proto`와 `x-nginx-host`를 참조하여 절대 URL을 구성하도록 변경했다.

```typescript
// src/proxy.ts 예시
const redirectWithNoCache = (path: string) => {
  const requestUrl = new URL(request.url);
  const nginxProto =
    request.headers.get('x-nginx-proto') ||
    requestUrl.protocol.replace(':', '');
  const nginxHost = request.headers.get('x-nginx-host') || requestUrl.host;
  const proto = nginxProto.startsWith('https') ? 'https' : 'http';

  // Nginx로부터 정제되어 들어온 x-nginx-host를 활용하여 깨끗한 절대 리다이렉트 주소 조립
  const absoluteUrl = new URL(path, `${proto}://${nginxHost}`);

  const response = NextResponse.redirect(absoluteUrl, 307);
  response.headers.set(
    'Cache-Control',
    'no-store, no-cache, must-revalidate, proxy-revalidate'
  );
  return response;
};
```

- 로컬 개발 환경(`npm run dev`)에서는 해당 헤더가 없으므로 로컬 호스트 주소(`localhost:3000`)로 자연스럽게 폴백 처리되어 개발 환경이 깨지지 않는다.

### 3-4. 마이그레이션/앱 에러 실시간 로깅 자동화 (`start-logger.js`)

애플리케이션이 가동되는 도중 발생하는 중대 결함이나 DB 연동 실패 오류를 호스트 환경에서 편하게 감시할 수 있도록 스타터 스크립트를 작성하여 에러 로그(stderr)만 추출하여 하루 최대 1000줄로 잘라서 날짜별 로그 파일로 보존하고 이를 볼륨으로 마운트하여 호스트에서도 즉시 모니터링할 수 있도록 로깅 체계를 다듬었다.

---

## 4. 정리

- **프록시 헤더 스푸핑(Spoofing) 주의**: 공공 인터넷망에 노출된 `X-Forwarded-*` 헤더는 변조가 매우 용이하여 보안상 전적으로 신뢰할 수 없다. Nginx 같은 내부 신뢰 프록시가 외부 유입 헤더를 덮어쓰고, 앱에서는 전용 커스텀 헤더(`x-nginx-*`)를 확인하는 방식이 한층 더 안전하다.
- **명시적인 헤더 신뢰 설계**: 앱이 호스트/프로토콜 정보를 묵시적으로 수집하는 방식 대신, 신뢰할 수 있는 전송 통로(내부 프록시)가 계산해 준 특정 헤더를 명시적으로 신뢰하여 절대 경로를 구성하는 것이 안전하다.
