import Logo from "../assets/images/logo-1.png";

export function Topbar() {
  return (
    <header className="h-12 bg-gray-900 text-white flex justify-between items-center px-4">
      <div className="flex items-center gap-3">
        <img src={Logo} alt="Maono" className="h-7 w-auto" />
      </div>

      <div className="flex items-center gap-4">
        <button className="text-xs">EN</button>
        <button className="text-xs">🌗</button>
        <button className="text-xs">👤</button>
      </div>
    </header>
  );
}
