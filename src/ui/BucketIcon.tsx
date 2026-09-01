// Balde de ração premium — ilustração SVG inline (madeira + ração dourada).
// Usado no thumb da opção de compra de ração na Loja do Lago.
export function BucketIcon() {
  return (
    <svg className="bucket-icon" viewBox="0 0 64 64" aria-hidden focusable="false">
      {/* alça */}
      <path d="M15 27 Q32 5 49 27" fill="none" stroke="#2e5560" strokeWidth="4.5" strokeLinecap="round" />
      {/* ração na boca do balde (grãos dourados premium + comuns) */}
      <ellipse cx="32" cy="28" rx="17" ry="6.5" fill="#6b4a33" />
      <circle cx="24.5" cy="26" r="3.4" fill="#d9a13c" />
      <circle cx="32.5" cy="24.6" r="2.8" fill="#5c4033" />
      <circle cx="39.5" cy="26.4" r="3.1" fill="#d9a13c" />
      <circle cx="29" cy="27.6" r="2.2" fill="#e8bd63" />
      <circle cx="36" cy="28" r="1.8" fill="#e8bd63" />
      {/* corpo cônico de ripas */}
      <path d="M14 28.5 Q32 34.5 50 28.5 L45.5 55 Q32 61 18.5 55 Z" fill="#b5773f" />
      <path d="M23.5 31.8 L25.8 57.5" stroke="#8a5426" strokeWidth="2" strokeLinecap="round" />
      <path d="M40.5 31.8 L38.2 57.5" stroke="#8a5426" strokeWidth="2" strokeLinecap="round" />
      <path d="M32 33.4 L32 60" stroke="#9c622f" strokeWidth="1.6" strokeLinecap="round" />
      {/* aros de metal */}
      <path d="M13.5 28.5 Q32 34.8 50.5 28.5" fill="none" stroke="#2e5560" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M18.5 55 Q32 61 45.5 55" fill="none" stroke="#2e5560" strokeWidth="4" strokeLinecap="round" />
      {/* brilho na madeira */}
      <path d="M20 34.5 L22 50.5" stroke="rgba(255,255,255,.25)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
