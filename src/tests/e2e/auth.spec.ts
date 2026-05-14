import { test, expect } from '@playwright/test';

test.describe('인증 흐름', () => {
  test('등록되지 않은 번호로 로그인 시도 시 에러 메시지 표시', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('#name', '미가입자');
    await page.fill('#phone', '010-9999-9999');
    await page.click('button[type="submit"]');

    // 토스트 메시지 확인
    await expect(page.getByText('등록되지 않은 전화번호입니다.')).toBeVisible();
  });

  test('회원가입 요청 및 대기 화면 확인', async ({ page }) => {
    await page.goto('/signup');
    
    const testPhone = `010${Math.floor(10000000 + Math.random() * 90000000)}`;
    
    await page.fill('#name', 'E2E테스트');
    await page.fill('#phone', testPhone);
    await page.check('input[type="checkbox"]');
    await page.click('button[type="submit"]');

    // 승인 대기 페이지로 리다이렉트 확인
    await expect(page).toHaveURL('/pending');
    await expect(page.getByText('승인 대기 중')).toBeVisible();
  });
});
