import React from 'react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../hooks/useTheme'

interface WaterLevelCrossSectionDiagramProps {
  currentLevel: number
  unit: string
  className?: string
  compact?: boolean
}

// Reference levels and terminology:
// - Absolute water level: Measured from sea level datum (standard geodetic reference)
// - Relative water level: Measured from Zerogate baseline (300.5m above sea level)
// - Zerogate: The baseline reference point at 300.5m above sea level
const ZEROGATE_LEVEL = 300.5  // Zerogate baseline level (300.5m above sea level)
const WARNING_LEVEL = 303.6   // Warning water level (3.1m relative from Zerogate)
const CRITICAL_LEVEL = 304.2  // Critical overflow level (3.7m relative from Zerogate)
const FLOOD_2024_LEVEL = 305.78  // 2024 flood level (5.28m relative from Zerogate)

const WaterLevelCrossSectionDiagram: React.FC<WaterLevelCrossSectionDiagramProps> = ({
  currentLevel,
  unit,
  className = "",
  compact = false
}) => {
  const { t, i18n } = useTranslation()
  const { theme } = useTheme()
  // SVG dimensions - optimized to fill container width better
  const width = compact ? 380 : 720  // Reduced width to fit better
  const height = compact ? 120 : 280  // Moderately reduced height for compact mode
  const margin = compact 
    ? { top: 10, right: 40, bottom: 12, left: 25 }  // Balanced margins for compact
    : { top: 20, right: 60, bottom: 35, left: 45 }
  
  // Scale setup - map water levels to SVG coordinates
  const minLevel = 298.5
  const maxLevel = 307
  const scaleY = (level: number) => {
    return height - margin.bottom - ((level - minLevel) / (maxLevel - minLevel)) * (height - margin.top - margin.bottom)
  }
  
  // River channel points (creating a trapezoidal cross-section)
  const riverBedLevel = 299.0
  const bankTopLevel = CRITICAL_LEVEL // River bank top level = critical overflow level (304.2)
  const bankWidth = width - margin.left - margin.right
  const riverBedWidth = bankWidth * 0.4
  const riverBankWidth = bankWidth * 0.7
  const riverBedStart = margin.left + (bankWidth - riverBedWidth) / 2
  const riverBedEnd = riverBedStart + riverBedWidth
  const riverBankStart = margin.left + (bankWidth - riverBankWidth) / 2
  const riverBankEnd = riverBankStart + riverBankWidth
  

  // Left river bank path (from ground level down to channel)
  const leftBankPath = `
    M ${margin.left} ${scaleY(bankTopLevel)}
    L ${riverBankStart} ${scaleY(bankTopLevel)}
    L ${riverBedStart} ${scaleY(riverBedLevel)}
    L ${margin.left} ${scaleY(riverBedLevel)}
    Z
  `
  
  // Right river bank path (from ground level down to channel)
  const rightBankPath = `
    M ${riverBankEnd} ${scaleY(bankTopLevel)}
    L ${width - margin.right} ${scaleY(bankTopLevel)}
    L ${width - margin.right} ${scaleY(riverBedLevel)}
    L ${riverBedEnd} ${scaleY(riverBedLevel)}
    Z
  `
  
  // River channel inner path (between banks)
  const riverInnerPath = `
    M ${riverBankStart} ${scaleY(bankTopLevel)}
    L ${riverBedStart} ${scaleY(riverBedLevel)}
    L ${riverBedEnd} ${scaleY(riverBedLevel)}
    L ${riverBankEnd} ${scaleY(bankTopLevel)}
    Z
  `
  
  // Water level path (only show water if current level is above river bed)
  const waterLevel = Math.max(currentLevel, riverBedLevel)
  const waterTopLevel = scaleY(waterLevel)
  
  // Calculate water surface width based on the trapezoidal shape between banks
  let waterSurfaceStart, waterSurfaceEnd, waterPath
  
  if (waterLevel <= bankTopLevel) {
    // Water is within the river banks
    const bankHeight = bankTopLevel - riverBedLevel
    const waterHeight = waterLevel - riverBedLevel
    const bankWidthDiff = riverBankWidth - riverBedWidth
    const waterWidthIncrease = (waterHeight / bankHeight) * bankWidthDiff
    const waterSurfaceWidth = riverBedWidth + waterWidthIncrease
    waterSurfaceStart = margin.left + (bankWidth - waterSurfaceWidth) / 2
    waterSurfaceEnd = waterSurfaceStart + waterSurfaceWidth
    
    waterPath = `
      M ${waterSurfaceStart} ${waterTopLevel}
      L ${riverBedStart} ${scaleY(riverBedLevel)}
      L ${riverBedEnd} ${scaleY(riverBedLevel)}
      L ${waterSurfaceEnd} ${waterTopLevel}
      Z
    `
  } else {
    // Water has overflowed the banks
    const overflowHeight = waterLevel - bankTopLevel
    const maxOverflowHeight = maxLevel - bankTopLevel
    const overflowRatio = overflowHeight / maxOverflowHeight
    const overflowWidth = (bankWidth - riverBankWidth) * overflowRatio
    const waterSurfaceWidth = riverBankWidth + overflowWidth
    waterSurfaceStart = margin.left + (bankWidth - waterSurfaceWidth) / 2
    waterSurfaceEnd = waterSurfaceStart + waterSurfaceWidth
    
    waterPath = `
      M ${waterSurfaceStart} ${waterTopLevel}
      L ${riverBankStart} ${scaleY(bankTopLevel)}
      L ${riverBedStart} ${scaleY(riverBedLevel)}
      L ${riverBedEnd} ${scaleY(riverBedLevel)}
      L ${riverBankEnd} ${scaleY(bankTopLevel)}
      L ${waterSurfaceEnd} ${waterTopLevel}
      Z
    `
  }
  
  // Station structure (simplified) - positioned on riverbank/ground
  const stationX = margin.left + 20
  const stationY = scaleY(bankTopLevel) // Station built on ground level
  
  // Tree structure on the right - planted on ground
  const treeX = width - margin.right - 30
  const treeY = scaleY(bankTopLevel) // Tree planted on ground level
  
  // Reference lines data
  const referenceLines = [
    { level: WARNING_LEVEL, color: '#F59E0B', label: 'Warning Level', dashArray: '5,5' },
    { level: CRITICAL_LEVEL, color: '#DC2626', label: 'Critical/Bank Level', dashArray: 'none' },
    { level: FLOOD_2024_LEVEL, color: '#8B5CF6', label: '2024 Flood Level', dashArray: '3,3' }
  ]
  
  return (
    <div className={`bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-800 ${className}`}>
      {compact ? (
        <div className="px-2 pt-1.5 pb-0.5">
          <h4 className="text-xs font-medium text-gray-900 dark:text-gray-100 mb-1 text-center">{t('waterLevel.crossSection.referenceTitle')}</h4>
        </div>
      ) : (
        <div className="px-3 pt-3 pb-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {t('waterLevel.crossSection.title')}
          </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
            {t('waterLevel.crossSection.currentLevel')}: <span className="font-semibold">{currentLevel.toFixed(2)} {unit}</span>
            {' '}(+{(currentLevel - ZEROGATE_LEVEL).toFixed(2)} {unit} {t('waterLevel.crossSection.fromZerogate')})
          </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {t('waterLevel.crossSection.groundLevel')} {CRITICAL_LEVEL} {unit} ({t('waterLevel.crossSection.criticalPoint')}). 
            {t('waterLevel.crossSection.overflowDescription')}
          </p>
        </div>
      )}
      
      <div className={compact ? "px-2" : "px-2"}>
        <svg width={width} height={height} className="w-full h-auto" viewBox={`0 0 ${width} ${height}`}>
          <defs>
            {/* Gradient for river channel */}
            <linearGradient id="riverChannelGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#D2B48C" />
              <stop offset="100%" stopColor="#CD853F" />
            </linearGradient>
            
            {/* Gradient for river banks */}
            <linearGradient id="riverBankGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#90EE90" />
              <stop offset="30%" stopColor="#8FBC8F" />
              <stop offset="100%" stopColor="#6B8E23" />
            </linearGradient>
            
            {/* Gradient for water */}
            <linearGradient id="waterGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#87CEEB" />
              <stop offset="100%" stopColor="#4682B4" />
            </linearGradient>
          </defs>
          
          {/* Ground/terrain background */}
          <rect
            x={margin.left}
            y={scaleY(bankTopLevel)}
            width={width - margin.left - margin.right}
            height={scaleY(minLevel) - scaleY(bankTopLevel)}
            fill="#F5F5DC"
          />
          
          {/* Sky/air space above ground */}
          <rect
            x={margin.left}
            y={scaleY(maxLevel)}
            width={width - margin.left - margin.right}
            height={scaleY(bankTopLevel) - scaleY(maxLevel)}
            fill="#E6F3FF"
            opacity="0.3"
          />
          
          {/* Left river bank */}
          <path
            d={leftBankPath}
            fill="url(#riverBankGradient)"
            stroke="#556B2F"
            strokeWidth="1"
          />
          
          {/* Right river bank */}
          <path
            d={rightBankPath}
            fill="url(#riverBankGradient)"
            stroke="#556B2F"
            strokeWidth="1"
          />
          
          {/* River channel (between banks) */}
          <path
            d={riverInnerPath}
            fill="url(#riverChannelGradient)"
            stroke="#8B4513"
            strokeWidth="2"
          />
          
          {/* Bank edges/retaining walls */}
          <line
            x1={riverBankStart}
            y1={scaleY(bankTopLevel)}
            x2={riverBedStart}
            y2={scaleY(riverBedLevel)}
            stroke="#8B4513"
            strokeWidth="3"
          />
          <line
            x1={riverBankEnd}
            y1={scaleY(bankTopLevel)}
            x2={riverBedEnd}
            y2={scaleY(riverBedLevel)}
            stroke="#8B4513"
            strokeWidth="3"
          />
          
          {/* River bank top edges (overflow points) */}
          <line
            x1={riverBankStart}
            y1={scaleY(bankTopLevel)}
            x2={riverBankStart}
            y2={scaleY(bankTopLevel) - 5}
            stroke="#DC2626"
            strokeWidth="4"
          />
          <line
            x1={riverBankEnd}
            y1={scaleY(bankTopLevel)}
            x2={riverBankEnd}
            y2={scaleY(bankTopLevel) - 5}
            stroke="#DC2626"
            strokeWidth="4"
          />
          
          {/* Bank top surface indicators and overflow edge */}
          <rect
            x={riverBankStart - 2}
            y={scaleY(bankTopLevel) - 3}
            width="4"
            height="6"
            fill="#DC2626"
          />
          <rect
            x={riverBankEnd - 2}
            y={scaleY(bankTopLevel) - 3}
            width="4"
            height="6"
            fill="#DC2626"
          />
          
          {/* Horizontal bank top edges - overflow spillway */}
          <line
            x1={margin.left}
            y1={scaleY(bankTopLevel)}
            x2={riverBankStart}
            y2={scaleY(bankTopLevel)}
            stroke="#DC2626"
            strokeWidth="6"
            opacity="0.9"
          />
          <line
            x1={riverBankEnd}
            y1={scaleY(bankTopLevel)}
            x2={width - margin.right}
            y2={scaleY(bankTopLevel)}
            stroke="#DC2626"
            strokeWidth="6"
            opacity="0.9"
          />
          
          {/* Bank top surface (concrete/stone) */}
          <rect
            x={margin.left}
            y={scaleY(bankTopLevel) - 1}
            width={riverBankStart - margin.left}
            height="2"
            fill="#8B8B8B"
          />
          <rect
            x={riverBankEnd}
            y={scaleY(bankTopLevel) - 1}
            width={width - margin.right - riverBankEnd}
            height="2"
            fill="#8B8B8B"
          />
          
          {/* Overflow arrows when water exceeds bank level */}
          {currentLevel > bankTopLevel && (
            <>
              <polygon
                points={`${riverBankStart - 15},${scaleY(bankTopLevel)} ${riverBankStart - 5},${scaleY(bankTopLevel) - 5} ${riverBankStart - 5},${scaleY(bankTopLevel) + 5}`}
                fill="#FF0000"
                opacity="0.8"
              />
              <polygon
                points={`${riverBankEnd + 15},${scaleY(bankTopLevel)} ${riverBankEnd + 5},${scaleY(bankTopLevel) - 5} ${riverBankEnd + 5},${scaleY(bankTopLevel) + 5}`}
                fill="#FF0000"
                opacity="0.8"
              />
              <text
                x={riverBankStart - 20}
                y={scaleY(bankTopLevel) + 20}
                fontSize="10"
                fill="#FF0000"
                fontWeight="bold"
                textAnchor="middle"
              >
                OVERFLOW
              </text>
              <text
                x={riverBankEnd + 20}
                y={scaleY(bankTopLevel) + 20}
                fontSize="10"
                fill="#FF0000"
                fontWeight="bold"
                textAnchor="middle"
              >
                OVERFLOW
              </text>
            </>
          )}
          
          {/* Water */}
          {waterLevel > riverBedLevel && (
            <path
              d={waterPath}
              fill="url(#waterGradient)"
              stroke="#4682B4"
              strokeWidth="1"
              opacity="0.8"
            />
          )}
          
          {/* Reference level lines */}
          {referenceLines.map((line, index) => (
            <g key={index}>
              <line
                x1={margin.left}
                y1={scaleY(line.level)}
                x2={width - margin.right}
                y2={scaleY(line.level)}
                stroke={line.color}
                strokeWidth="2"
                strokeDasharray={line.dashArray}
                opacity="0.8"
              />
              <text
                x={width - margin.right + 3}
                y={scaleY(line.level) + 3}
                fontSize={compact ? "7" : "10"}
                fill={line.color}
                fontWeight="bold"
              >
                {line.level.toFixed(1)}
              </text>
            </g>
          ))}
          
          {/* Current water level indicator */}
          <g>
            <line
              x1={margin.left}
              y1={scaleY(currentLevel)}
              x2={width - margin.right}
              y2={scaleY(currentLevel)}
              stroke="#1E40AF"
              strokeWidth="3"
              opacity="0.9"
            />
            {waterSurfaceStart && waterSurfaceEnd && (
              <>
                <circle
                  cx={(waterSurfaceStart + waterSurfaceEnd) / 2}
                  cy={scaleY(currentLevel)}
                  r="4"
                  fill="#1E40AF"
                  stroke={theme === 'dark' ? '#374151' : 'white'}
                  strokeWidth="1"
                />
                {/* Text background for better readability */}
                <rect
                  x={(waterSurfaceStart + waterSurfaceEnd) / 2 - 20}
                  y={scaleY(currentLevel) + 6}
                  width="40"
                  height={compact ? "12" : "14"}
                  fill={theme === 'dark' ? '#1f2937' : 'white'}
                  stroke="#1E40AF"
                  strokeWidth="1"
                  rx="2"
                  opacity="0.9"
                />
                <text
                  x={(waterSurfaceStart + waterSurfaceEnd) / 2}
                  y={scaleY(currentLevel) + (compact ? 15 : 17)}
                  fontSize={compact ? "10" : "12"}
                  fill="#1E40AF"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {currentLevel.toFixed(2)}
                </text>
              </>
            )}
          </g>
          
          {/* Station structure - simplified for compact view */}
          <g>
            {/* Foundation/base platform */}
            <rect
              x={stationX - 15}
              y={stationY - 3}
              width="30"
              height="6"
              fill="#8B8B8B"
              stroke="#666"
              strokeWidth="1"
            />
            {/* Station base */}
            <rect
              x={stationX - 12}
              y={stationY - 25}
              width="24"
              height="22"
              fill="#A0A0A0"
              stroke="#666"
              strokeWidth="1"
            />
            {/* Station tower */}
            <rect
              x={stationX - 6}
              y={stationY - 45}
              width="12"
              height="20"
              fill="#A0A0A0"
              stroke="#666"
              strokeWidth="1"
            />
            {/* Station equipment */}
            <rect
              x={stationX - 5}
              y={stationY - 42}
              width="10"
              height="6"
              fill="#E0E0E0"
              stroke="#666"
              strokeWidth="1"
            />
            {/* Support pillars */}
            <rect
              x={stationX - 9}
              y={stationY - 3}
              width="3"
              height="25"
              fill="#888"
              stroke="#666"
              strokeWidth="1"
            />
            <rect
              x={stationX + 6}
              y={stationY - 3}
              width="3"
              height="25"
              fill="#888"
              stroke="#666"
              strokeWidth="1"
            />
            {/* Antenna/sensor */}
            <line
              x1={stationX}
              y1={stationY - 45}
              x2={stationX}
              y2={stationY - 55}
              stroke="#333"
              strokeWidth="2"
            />
            <circle
              cx={stationX}
              cy={stationY - 55}
              r="2"
              fill="#FF0000"
            />
            
            {/* Station label */}
            {!compact && (
              <text
                x={stationX}
                y={stationY + 12}
                fontSize="7"
                fill="#333"
                fontWeight="bold"
                textAnchor="middle"
              >
                TP.1 Station
              </text>
            )}
          </g>
          
          {/* Tree structure - simplified */}
          <g>
            {/* Tree trunk */}
            <rect
              x={treeX - 3}
              y={treeY - 40}
              width="6"
              height="40"
              fill="#8B4513"
            />
            {/* Tree foliage */}
            <ellipse
              cx={treeX}
              cy={treeY - 50}
              rx="15"
              ry="20"
              fill="#228B22"
              opacity="0.8"
            />
            <ellipse
              cx={treeX - 5}
              cy={treeY - 45}
              rx="12"
              ry="15"
              fill="#32CD32"
              opacity="0.7"
            />
          </g>
          
          {/* Y-axis labels - only for non-compact */}
          {!compact && (
            <g>
              <text
                x={margin.left - 5}
                y={height - margin.bottom + 15}
                fontSize="9"
                fill="#666"
                textAnchor="end"
                fontWeight="bold"
              >
                Level ({unit})
              </text>
              
              {/* Scale markers */}
              {[299, 300, 301, 302, 303, 304, 305, 306].map(level => (
                <g key={level}>
                  <line
                    x1={margin.left - 3}
                    y1={scaleY(level)}
                    x2={margin.left}
                    y2={scaleY(level)}
                    stroke="#666"
                    strokeWidth="1"
                  />
                  <text
                    x={margin.left - 5}
                    y={scaleY(level) + 3}
                    fontSize="8"
                    fill="#666"
                    textAnchor="end"
                  >
                    {level}
                  </text>
                </g>
              ))}
            </g>
          )}
        </svg>
      </div>
      
      {/* Legend / Reference Levels */}
      <div className={`${compact ? 'px-2 pb-1.5' : 'px-3 pb-3'}`}>
        {compact ? (
          <div className="grid grid-cols-2 gap-1.5 text-xs leading-tight">
            <div className="flex items-center justify-between px-2 py-1 bg-green-50 rounded">
              <span className="font-medium text-green-800">Zerogate</span>
              <span className="text-green-700">0.0{unit} (300.5{unit})</span>
            </div>
            <div className={`flex items-center justify-between px-2 py-1 bg-yellow-50 rounded ${
              currentLevel >= WARNING_LEVEL ? 'ring-1 ring-yellow-300' : ''
            }`}>
              <span className="font-medium text-yellow-800">Warning</span>
              <span className="text-yellow-700">+3.1{unit} (303.6{unit})</span>
            </div>
            <div className={`flex items-center justify-between px-2 py-1 bg-red-50 rounded ${
              currentLevel >= CRITICAL_LEVEL ? 'ring-1 ring-red-300' : ''
            }`}>
              <span className="font-medium text-red-800">Critical</span>
              <span className="text-red-700">+3.7{unit} (304.2{unit})</span>
            </div>
            <div className={`flex items-center justify-between px-2 py-1 bg-purple-50 rounded ${
              currentLevel >= FLOOD_2024_LEVEL ? 'ring-1 ring-purple-300' : ''
            }`}>
                              <span className="font-medium text-purple-800">{i18n.language === 'th' ? 'น้ำท่วม 67' : '2024 Flood'}</span>
              <span className="text-purple-700">+5.3{unit} (305.8{unit})</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-2 bg-yellow-500 rounded"></div>
              <span>{t('waterLevel.crossSection.warningLevel')}: +{(WARNING_LEVEL - ZEROGATE_LEVEL).toFixed(2)}{unit} ({WARNING_LEVEL.toFixed(1)}{unit})</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-2 bg-red-600 rounded"></div>
              <span>{t('waterLevel.crossSection.criticalLevel')}: +{(CRITICAL_LEVEL - ZEROGATE_LEVEL).toFixed(2)}{unit} ({CRITICAL_LEVEL.toFixed(1)}{unit})</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-2 bg-purple-600 rounded"></div>
              <span>{t('waterLevel.crossSection.floodLevel')}: +{(FLOOD_2024_LEVEL - ZEROGATE_LEVEL).toFixed(2)}{unit} ({FLOOD_2024_LEVEL.toFixed(2)}{unit})</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-2 bg-blue-600 rounded"></div>
              <span>{t('waterLevel.crossSection.currentLevelShort')}: {currentLevel.toFixed(1)} {unit}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default WaterLevelCrossSectionDiagram 