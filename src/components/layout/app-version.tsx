import pkg from '../../../package.json';

export const AppVersion = () => {
  return (
    <div className="pt-2 text-center">
      <span className="text-muted-foreground block text-[12px]">
        v{pkg.version} · 샘깊은교회 문화사역 장소방
      </span>
    </div>
  );
};
