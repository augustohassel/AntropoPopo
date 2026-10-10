import React from 'react';
import { Somatotype } from '../../types';

interface SomatochartProps {
  current?: Somatotype;
  previous?: Somatotype[];
  size?: number;
  showLabels?: boolean;
}

/**
 * Convierte coordenadas somatotípicas (X: ecto-endo, Y: 2*meso-(endo+ecto))
 * a coordenadas SVG (viewBox -100 a +100 en X, -100 a +100 en Y)
 */
function toSvgCoords(x: number, y: number): { cx: number; cy: number } {
  // Rango X: -9 a +9 -> mapeado a -80 a +80
  // Rango Y: -8 a +16 -> mapeado a +70 (abajo) a -80 (arriba)
  const scaleX = 8.8; // 80 / 9
  const scaleY = 6.2; // 80 / 13

  const cx = x * scaleX;
  const cy = -y * scaleY; // en SVG el eje Y positivo va hacia abajo
  return { cx, cy };
}

export const Somatochart: React.FC<SomatochartProps> = ({
  current,
  previous = [],
  size = 320,
  showLabels = true,
}) => {
  const currentCoords = current ? toSvgCoords(current.x, current.y) : null;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          viewBox="-100 -100 200 200"
          className="w-full h-full drop-shadow-md select-none"
        >
          <defs>
            {/* Gradiente de fondo de la somatocarta */}
            <radialGradient id="somatoBg" cx="0%" cy="-30%" r="90%">
              <stop offset="0%" stopColor="#0f172a" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#020617" stopOpacity="0.95" />
            </radialGradient>

            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Triángulo esférico de Reuleaux (perímetro clásico de Heath & Carter) */}
          <path
            d="M 0 -85 A 150 150 0 0 1 76 50 A 150 150 0 0 1 -76 50 A 150 150 0 0 1 0 -85 Z"
            fill="url(#somatoBg)"
            stroke="#334155"
            strokeWidth="1.5"
          />

          {/* Sectores somatotípicos sutiles */}
          <path
            d="M 0 0 L 0 -85 M 0 0 L 76 50 M 0 0 L -76 50"
            stroke="#1e293b"
            strokeWidth="1.2"
            strokeDasharray="3 3"
          />

          {/* Círculos concéntricos de referencia */}
          <circle cx="0" cy="0" r="30" fill="none" stroke="#1e293b" strokeWidth="0.8" />
          <circle cx="0" cy="0" r="60" fill="none" stroke="#1e293b" strokeWidth="0.8" />

          {/* Ejes principales X e Y */}
          <line x1="-80" y1="0" x2="80" y2="0" stroke="#475569" strokeWidth="1" strokeDasharray="2 2" />
          <line x1="0" y1="-85" x2="0" y2="70" stroke="#475569" strokeWidth="1" strokeDasharray="2 2" />

          {/* Etiquetas de los tres componentes extremos */}
          {showLabels && (
            <>
              {/* Arriba: Mesomorfia */}
              <text
                x="0"
                y="-88"
                textAnchor="middle"
                fill="#38bdf8"
                fontSize="7.5"
                fontWeight="700"
                className="tracking-wider"
              >
                MESOMORFIA
              </text>
              <text x="0" y="-78" textAnchor="middle" fill="#64748b" fontSize="5">
                (Robustez músculo-esquelética)
              </text>

              {/* Abajo izquierda: Endomorfia */}
              <text
                x="-65"
                y="62"
                textAnchor="middle"
                fill="#f43f5e"
                fontSize="7.5"
                fontWeight="700"
                className="tracking-wider"
              >
                ENDOMORFIA
              </text>
              <text x="-65" y="70" textAnchor="middle" fill="#64748b" fontSize="5">
                (Adiposidad relativa)
              </text>

              {/* Abajo derecha: Ectomorfia */}
              <text
                x="65"
                y="62"
                textAnchor="middle"
                fill="#a855f7"
                fontSize="7.5"
                fontWeight="700"
                className="tracking-wider"
              >
                ECTOMORFIA
              </text>
              <text x="65" y="70" textAnchor="middle" fill="#64748b" fontSize="5">
                (Linealidad relativa)
              </text>

              {/* Origen (0,0) */}
              <text x="3" y="-3" fill="#64748b" fontSize="4.5">
                (0,0)
              </text>
            </>
          )}

          {/* Trayectoria histórica (flechas o líneas discontinuas) */}
          {previous.length > 0 && current && (
            <g opacity="0.6">
              {previous.map((prev, idx) => {
                const prevCoords = toSvgCoords(prev.x, prev.y);
                return (
                  <g key={`prev-${idx}`}>
                    <line
                      x1={prevCoords.cx}
                      y1={prevCoords.cy}
                      x2={currentCoords!.cx}
                      y2={currentCoords!.cy}
                      stroke="#06c4ae"
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                    />
                    <circle
                      cx={prevCoords.cx}
                      cy={prevCoords.cy}
                      r="3.5"
                      fill="#64748b"
                      stroke="#0f172a"
                      strokeWidth="1"
                    />
                  </g>
                );
              })}
            </g>
          )}

          {/* Punto de la medición actual */}
          {currentCoords && (
            <g filter="url(#glow)">
              <circle
                cx={currentCoords.cx}
                cy={currentCoords.cy}
                r="7"
                fill="#06c4ae"
                fillOpacity="0.3"
                className="animate-ping"
              />
              <circle
                cx={currentCoords.cx}
                cy={currentCoords.cy}
                r="5"
                fill="#14b8a6"
                stroke="#ffffff"
                strokeWidth="1.8"
              />
            </g>
          )}
        </svg>

        {/* Badge flotante de coordenadas */}
        {current && (
          <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center text-[11px] font-mono bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800">
            <span className="text-slate-400">
              X: <span className="text-white font-semibold">{current.x}</span>
            </span>
            <span className="text-slate-400">
              Y: <span className="text-white font-semibold">{current.y}</span>
            </span>
            <span className="text-brand-400 font-semibold">{current.category}</span>
          </div>
        )}
      </div>

      {current && (
        <div className="mt-3 flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span className="text-slate-400">Endo:</span>
            <span className="font-bold text-white">{current.endo}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-sky-400" />
            <span className="text-slate-400">Meso:</span>
            <span className="font-bold text-white">{current.meso}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-purple-400" />
            <span className="text-slate-400">Ecto:</span>
            <span className="font-bold text-white">{current.ecto}</span>
          </div>
        </div>
      )}
    </div>
  );
};
