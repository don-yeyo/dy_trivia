import React, { useEffect, useState } from 'react';

/**
 * Componente de Fondo de Rayos Rectos Giratorios (Sunburst Effect)
 * Se forma desde el centro con aceleración al aparecer cada pantalla
 * y rota continuamente de fondo.
 */
export default function SunburstBackground({ screenKey }) {
  const [animatingKey, setAnimatingKey] = useState(screenKey);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (screenKey !== animatingKey) {
      // Desvanecimiento rápido de salida antes de formar los nuevos rayos
      setIsExiting(true);
      const timeout = setTimeout(() => {
        setAnimatingKey(screenKey);
        setIsExiting(false);
      }, 180);
      return () => clearTimeout(timeout);
    }
  }, [screenKey, animatingKey]);

  return (
    <div 
      id="fondo-rayos-giratorios"
      className={`sunburst-wrapper ${isExiting ? 'sunburst-exit' : 'sunburst-enter'}`}
      aria-hidden="true"
    >
      <div className="sunburst-spinner" />
      <div className="sunburst-glow" />
    </div>
  );
}
