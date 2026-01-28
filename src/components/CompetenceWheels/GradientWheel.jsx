import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import './GradientWheel.css';

/**
 * GradientWheel - SVG-based competence wheel with soft gradient rings
 *
 * Renders a 2D wheel with segments (outer) and rings (inner dimension).
 * Lit cells show vibrant colors with soft glow, unlit are muted.
 */
function GradientWheel({
  segments,
  rings,
  litCells = new Set(),
  onCellClick,
  onCellHover,
  size = 320,
  centerLabel = '',
  showLabels = false,
  interactive = true,
  className = '',
  celebrate = false,
}) {
  const [hoveredCell, setHoveredCell] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [newlyLitCells, setNewlyLitCells] = useState(new Set());
  const [showSparkles, setShowSparkles] = useState(false);
  const [sparklePositions, setSparklePositions] = useState([]);
  const prevLitCellsRef = useRef(new Set());

  // Track newly lit cells for animation
  useEffect(() => {
    const prevLitCells = prevLitCellsRef.current;
    const newCells = new Set();

    litCells.forEach(cellId => {
      if (!prevLitCells.has(cellId)) {
        newCells.add(cellId);
      }
    });

    if (newCells.size > 0) {
      setNewlyLitCells(newCells);

      // Generate sparkle positions for celebration
      if (celebrate) {
        const sparkles = [];
        newCells.forEach(cellId => {
          const [segIdx, ringIdx] = cellId.split('-').map(Number);
          const angle = (segIdx * (360 / segments.length) + (360 / segments.length) / 2 - 90) * Math.PI / 180;
          const r = size * 0.3 + ringIdx * (size * 0.15);
          for (let i = 0; i < 3; i++) {
            sparkles.push({
              x: size / 2 + r * Math.cos(angle) + (Math.random() - 0.5) * 40,
              y: size / 2 + r * Math.sin(angle) + (Math.random() - 0.5) * 40,
            });
          }
        });
        setSparklePositions(sparkles);
        setShowSparkles(true);
        setTimeout(() => setShowSparkles(false), 1000);
      }

      // Clear newly-lit status after animation
      const timer = setTimeout(() => setNewlyLitCells(new Set()), 800);
      return () => clearTimeout(timer);
    }

    prevLitCellsRef.current = new Set(litCells);
  }, [litCells, celebrate, segments.length, size]);

  // Layout calculations
  const cx = size / 2;
  const cy = size / 2;
  const outerRadius = (size / 2) - 10;
  const innerRadius = size * 0.125; // 12.5% of size
  const ringWidth = (outerRadius - innerRadius) / rings.length;
  const segmentAngle = 360 / segments.length;

  // Generate unique filter ID for this instance
  const filterId = useMemo(() => `softGlow-${Math.random().toString(36).substr(2, 9)}`, []);

  // Calculate path for a cell
  const getCellPath = useCallback((segIdx, ringIdx) => {
    const startAngle = (segIdx * segmentAngle - 90) * Math.PI / 180;
    const endAngle = ((segIdx + 1) * segmentAngle - 90) * Math.PI / 180;
    const r1 = innerRadius + ringIdx * ringWidth;
    const r2 = innerRadius + (ringIdx + 1) * ringWidth;

    const x1 = cx + r1 * Math.cos(startAngle);
    const y1 = cy + r1 * Math.sin(startAngle);
    const x2 = cx + r2 * Math.cos(startAngle);
    const y2 = cy + r2 * Math.sin(startAngle);
    const x3 = cx + r2 * Math.cos(endAngle);
    const y3 = cy + r2 * Math.sin(endAngle);
    const x4 = cx + r1 * Math.cos(endAngle);
    const y4 = cy + r1 * Math.sin(endAngle);

    const largeArc = segmentAngle > 180 ? 1 : 0;

    return `M ${x1} ${y1} L ${x2} ${y2} A ${r2} ${r2} 0 ${largeArc} 1 ${x3} ${y3} L ${x4} ${y4} A ${r1} ${r1} 0 ${largeArc} 0 ${x1} ${y1}`;
  }, [cx, cy, innerRadius, ringWidth, segmentAngle]);

  // Handle mouse events
  const handleMouseEnter = (e, segment, ring, cellId) => {
    if (!interactive) return;
    setHoveredCell(cellId);
    setTooltipPos({ x: e.clientX, y: e.clientY });
    onCellHover?.(segment, ring, cellId, true);
  };

  const handleMouseLeave = (segment, ring, cellId) => {
    if (!interactive) return;
    setHoveredCell(null);
    onCellHover?.(segment, ring, cellId, false);
  };

  const handleMouseMove = (e) => {
    if (hoveredCell) {
      setTooltipPos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleClick = (segment, ring, cellId) => {
    if (!interactive) return;
    onCellClick?.(segment, ring, cellId);
  };

  // Get hovered cell info for tooltip
  const hoveredInfo = useMemo(() => {
    if (!hoveredCell) return null;
    const [segIdx, ringIdx] = hoveredCell.split('-').map(Number);
    return {
      segment: segments[segIdx],
      ring: rings[ringIdx],
    };
  }, [hoveredCell, segments, rings]);

  // Calculate label positions
  const getLabelPosition = (segIdx) => {
    const angle = (segIdx * segmentAngle + segmentAngle / 2 - 90) * Math.PI / 180;
    const r = outerRadius + 20;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
      rotation: segIdx * segmentAngle + segmentAngle / 2,
    };
  };

  return (
    <div className={`gradient-wheel ${className} ${celebrate ? 'celebrating' : ''}`} onMouseMove={handleMouseMove}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="gradient-wheel-svg"
      >
        {/* Definitions for filters */}
        <defs>
          <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Render cells */}
        {segments.map((segment, segIdx) => (
          rings.map((ring, ringIdx) => {
            const cellId = `${segIdx}-${ringIdx}`;
            const isLit = litCells.has(cellId);
            const isNewlyLit = newlyLitCells.has(cellId);
            const isHovered = hoveredCell === cellId;
            const hue = segment.hue ?? (segIdx * (360 / segments.length));

            return (
              <path
                key={cellId}
                d={getCellPath(segIdx, ringIdx)}
                fill={isLit
                  ? `hsl(${hue}, 70%, 55%)`
                  : `hsl(${hue}, 15%, 20%)`
                }
                opacity={isLit ? 0.9 : 0.4}
                filter={isLit ? `url(#${filterId})` : undefined}
                stroke="rgba(255,255,255,0.1)"
                strokeWidth={isHovered ? 2 : 0.5}
                className={`wheel-cell ${isLit ? 'lit' : 'unlit'} ${isHovered ? 'hovered' : ''} ${isNewlyLit ? 'newly-lit' : ''}`}
                style={{ cursor: interactive ? 'pointer' : 'default' }}
                onClick={() => handleClick(segment, ring, cellId)}
                onMouseEnter={(e) => handleMouseEnter(e, segment, ring, cellId)}
                onMouseLeave={() => handleMouseLeave(segment, ring, cellId)}
              />
            );
          })
        ))}

        {/* Center circle */}
        <circle
          cx={cx}
          cy={cy}
          r={innerRadius - 2}
          fill="#111"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="1"
        />

        {/* Center label */}
        {centerLabel && (
          <text
            x={cx}
            y={cy}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#666"
            fontSize="11"
            fontWeight="500"
            className="wheel-center-label"
          >
            {centerLabel}
          </text>
        )}

        {/* Segment labels around edge */}
        {showLabels && segments.map((segment, segIdx) => {
          const pos = getLabelPosition(segIdx);
          const rotation = pos.rotation > 90 && pos.rotation < 270
            ? pos.rotation + 180
            : pos.rotation;

          return (
            <text
              key={`label-${segIdx}`}
              x={pos.x}
              y={pos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#666"
              fontSize="9"
              transform={`rotate(${rotation}, ${pos.x}, ${pos.y})`}
              className="wheel-segment-label"
            >
              {segment.shortName || segment.name?.substring(0, 8)}
            </text>
          );
        })}
      </svg>

      {/* Tooltip */}
      {hoveredInfo && (
        <div
          className="wheel-tooltip visible"
          style={{
            left: tooltipPos.x + 15,
            top: tooltipPos.y - 10,
          }}
        >
          <div className="tooltip-segment">{hoveredInfo.segment.name || hoveredInfo.segment.displayName}</div>
          <div className="tooltip-ring">as {hoveredInfo.ring.label || hoveredInfo.ring.name}</div>
        </div>
      )}

      {/* Celebration sparkles */}
      {showSparkles && celebrate && (
        <div className="wheel-sparkles">
          {sparklePositions.map((pos, i) => (
            <div
              key={i}
              className="wheel-sparkle"
              style={{ left: pos.x, top: pos.y }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

GradientWheel.propTypes = {
  /** Array of segment objects with at least { id, name } and optionally { hue } */
  segments: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string,
    displayName: PropTypes.string,
    hue: PropTypes.number,
    shortName: PropTypes.string,
  })).isRequired,

  /** Array of ring objects with at least { id, label } */
  rings: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    label: PropTypes.string,
    name: PropTypes.string,
  })).isRequired,

  /** Set of lit cell IDs in format "segmentIndex-ringIndex" */
  litCells: PropTypes.instanceOf(Set),

  /** Callback when a cell is clicked: (segment, ring, cellId) => void */
  onCellClick: PropTypes.func,

  /** Callback when a cell is hovered: (segment, ring, cellId, isEntering) => void */
  onCellHover: PropTypes.func,

  /** Size of the wheel in pixels */
  size: PropTypes.number,

  /** Label to show in the center */
  centerLabel: PropTypes.string,

  /** Whether to show segment labels around the edge */
  showLabels: PropTypes.bool,

  /** Whether the wheel is interactive (clickable/hoverable) */
  interactive: PropTypes.bool,

  /** Additional CSS class */
  className: PropTypes.string,

  /** Enable celebration animations when cells light up */
  celebrate: PropTypes.bool,
};

export default GradientWheel;
