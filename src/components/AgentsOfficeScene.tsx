import { useMemo } from 'react'

interface AgentsOfficeSceneProps {
  igActive: boolean
  waActive: boolean
  tgActive: boolean
  calActive: boolean
  stats: { messages: number; leads: number; sales: number; appointments: number }
}

function RobotLogo({ type }: { type: string }) {
  if (type === 'whatsapp') return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="white" opacity={0.9}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
    </svg>
  )
  if (type === 'instagram') return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="white" strokeWidth="2.5" opacity={0.9}>
      <rect x="2" y="2" width="20" height="20" rx="5"/>
      <circle cx="12" cy="12" r="5"/>
    </svg>
  )
  if (type === 'telegram') return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="white" opacity={0.9}>
      <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
    </svg>
  )
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="white" strokeWidth="2" opacity={0.9}>
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
      <text x="12" y="18" textAnchor="middle" fill="white" stroke="none" fontSize="7" fontWeight="bold">21</text>
    </svg>
  )
}

export default function AgentsOfficeScene({ igActive, waActive, tgActive, calActive, stats }: AgentsOfficeSceneProps) {
  const agents = useMemo(() => [
    { id: 'wa', label: 'WhatsApp', active: waActive, color: '#25D366', glow: '#25D36650', logo: 'whatsapp', x: 8, bobDelay: 0 },
    { id: 'ig', label: 'Instagram', active: igActive, color: '#E1306C', glow: '#E1306C50', logo: 'instagram', x: 30, bobDelay: 0.8 },
    { id: 'tg', label: 'Telegram', active: tgActive, color: '#0088cc', glow: '#0088cc50', logo: 'telegram', x: 55, bobDelay: 1.6 },
    { id: 'cal', label: 'Calendar', active: calActive, color: '#4285F4', glow: '#4285F450', logo: 'calendar', x: 78, bobDelay: 2.4 },
  ], [igActive, waActive, tgActive, calActive])

  const onlineCount = [igActive, waActive, tgActive, calActive].filter(Boolean).length

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-gray-800" style={{ height: 260, background: 'linear-gradient(180deg, #0a0e1a 0%, #111827 40%, #1a1f2e 70%, #252b3b 100%)' }}>

      {/* Grid floor - perspective */}
      <svg className="absolute bottom-0 left-0 w-full" height="100" viewBox="0 0 800 100" preserveAspectRatio="none" style={{ opacity: 0.15 }}>
        {[...Array(15)].map((_, i) => (
          <line key={`h${i}`} x1="0" y1={i * 8} x2="800" y2={i * 8} stroke="#4fd1c5" strokeWidth="0.5" />
        ))}
        {[...Array(20)].map((_, i) => {
          const x = i * 50 - 100
          return <line key={`v${i}`} x1={400} y1={0} x2={x} y2={100} stroke="#4fd1c5" strokeWidth="0.5" />
        })}
      </svg>

      {/* Background glow orbs */}
      <div className="absolute top-8 left-1/4 w-32 h-32 rounded-full bg-cyan-500/5 blur-3xl" />
      <div className="absolute top-4 right-1/4 w-24 h-24 rounded-full bg-purple-500/5 blur-3xl" />

      {/* Network connections between robots */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.12 }}>
        {agents.map((a, i) =>
          agents.slice(i + 1).map(b => (
            <line key={`${a.id}-${b.id}`} x1={`${a.x + 5}%`} y1="55%" x2={`${b.x + 5}%`} y2="55%"
              stroke="#67e8f9" strokeWidth="0.5" strokeDasharray="4 4">
              <animate attributeName="stroke-dashoffset" values="8;0" dur="2s" repeatCount="indefinite" />
            </line>
          ))
        )}
      </svg>

      {/* Robots */}
      {agents.map((agent) => (
        <div
          key={agent.id}
          className="absolute"
          style={{
            left: `${agent.x}%`,
            bottom: 45,
            width: '16%',
            animation: `eveFloat 4s ease-in-out infinite`,
            animationDelay: `${agent.bobDelay}s`,
          }}
        >
          {/* Shadow on floor */}
          <div
            className="absolute -bottom-5 left-1/2 -translate-x-1/2 rounded-full"
            style={{
              width: 40,
              height: 8,
              background: `radial-gradient(ellipse, ${agent.active ? agent.glow : '#33333380'} 0%, transparent 70%)`,
              animation: `eveShadow 4s ease-in-out infinite`,
              animationDelay: `${agent.bobDelay}s`,
            }}
          />

          {/* Hover glow under robot */}
          {agent.active && (
            <div
              className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full"
              style={{
                width: 30,
                height: 12,
                background: `radial-gradient(ellipse, ${agent.color}40 0%, transparent 70%)`,
                filter: 'blur(4px)',
                animation: `eveShadow 4s ease-in-out infinite`,
                animationDelay: `${agent.bobDelay}s`,
              }}
            />
          )}

          <div className="flex flex-col items-center">
            {/* Notification bubble */}
            {agent.active && (
              <div
                className="absolute -top-5 -right-1 z-20"
                style={{ animation: `eveNotif 3s ease-in-out infinite`, animationDelay: `${agent.bobDelay + 1}s` }}
              >
                <div className="w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold text-white"
                  style={{ backgroundColor: agent.color, boxShadow: `0 0 8px ${agent.glow}` }}>
                  !
                </div>
              </div>
            )}

            {/* Head - EVE style oval */}
            <div className="relative">
              <div
                className="relative mx-auto rounded-full flex items-center justify-center"
                style={{
                  width: 36,
                  height: 32,
                  background: agent.active
                    ? `linear-gradient(135deg, #e8edf5 0%, #c8d0e0 50%, #a8b4c8 100%)`
                    : `linear-gradient(135deg, #6b7280 0%, #4b5563 50%, #374151 100%)`,
                  boxShadow: agent.active
                    ? `0 0 20px ${agent.glow}, inset 0 -2px 4px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.3)`
                    : `0 2px 8px rgba(0,0,0,0.3)`,
                }}
              >
                {/* Face visor */}
                <div
                  className="rounded-full flex items-center justify-center gap-1"
                  style={{
                    width: 26,
                    height: 12,
                    background: agent.active ? '#0c1425' : '#1f2937',
                    boxShadow: agent.active ? `inset 0 0 6px ${agent.color}40` : 'none',
                  }}
                >
                  {/* Eyes */}
                  <div
                    className="rounded-full"
                    style={{
                      width: 6, height: 6,
                      backgroundColor: agent.active ? '#67e8f9' : '#4b5563',
                      boxShadow: agent.active ? `0 0 6px #67e8f9, 0 0 12px ${agent.color}60` : 'none',
                      animation: agent.active ? `eveEyeBlink 5s infinite` : 'none',
                      animationDelay: `${agent.bobDelay}s`,
                    }}
                  />
                  <div
                    className="rounded-full"
                    style={{
                      width: 6, height: 6,
                      backgroundColor: agent.active ? '#67e8f9' : '#4b5563',
                      boxShadow: agent.active ? `0 0 6px #67e8f9, 0 0 12px ${agent.color}60` : 'none',
                      animation: agent.active ? `eveEyeBlink 5s infinite` : 'none',
                      animationDelay: `${agent.bobDelay + 0.1}s`,
                    }}
                  />
                </div>

                {/* Shine highlight */}
                <div className="absolute top-1 left-2 w-3 h-2 rounded-full bg-white/30" />
              </div>
            </div>

            {/* Body - EVE style capsule */}
            <div
              className="relative -mt-1 mx-auto rounded-2xl flex items-center justify-center"
              style={{
                width: 32,
                height: 38,
                background: agent.active
                  ? `linear-gradient(180deg, #dde3ee 0%, ${agent.color}30 100%)`
                  : `linear-gradient(180deg, #4b5563 0%, #374151 100%)`,
                boxShadow: agent.active
                  ? `0 4px 16px ${agent.glow}, inset 0 -2px 4px rgba(0,0,0,0.1)`
                  : `0 4px 8px rgba(0,0,0,0.3)`,
                borderRadius: '30% 30% 40% 40%',
              }}
            >
              {/* Channel badge */}
              <div
                className="rounded-full flex items-center justify-center"
                style={{
                  width: 20,
                  height: 20,
                  backgroundColor: agent.active ? agent.color : '#374151',
                  boxShadow: agent.active ? `0 0 10px ${agent.glow}` : 'none',
                }}
              >
                <RobotLogo type={agent.logo} />
              </div>

              {/* Body shine */}
              <div className="absolute top-2 left-1.5 w-2 h-6 rounded-full bg-white/15 rotate-12" />

              {/* Arms - small fins */}
              <div
                className="absolute -left-2 top-3 w-2 h-6 rounded-full"
                style={{
                  background: agent.active
                    ? `linear-gradient(180deg, #c8d0e0, ${agent.color}40)`
                    : '#4b5563',
                  animation: agent.active ? `eveArmL 3s ease-in-out infinite` : 'none',
                  animationDelay: `${agent.bobDelay}s`,
                  transformOrigin: 'top center',
                }}
              />
              <div
                className="absolute -right-2 top-3 w-2 h-6 rounded-full"
                style={{
                  background: agent.active
                    ? `linear-gradient(180deg, #c8d0e0, ${agent.color}40)`
                    : '#4b5563',
                  animation: agent.active ? `eveArmR 3s ease-in-out infinite` : 'none',
                  animationDelay: `${agent.bobDelay}s`,
                  transformOrigin: 'top center',
                }}
              />
            </div>

            {/* Label */}
            <div
              className="mt-2 text-[9px] font-bold tracking-wider uppercase text-center"
              style={{ color: agent.active ? agent.color : '#6b7280' }}
            >
              {agent.label}
            </div>
          </div>
        </div>
      ))}

      {/* Status bar */}
      <div className="absolute top-3 left-4 flex items-center gap-2 z-10">
        <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-sm rounded-full px-2.5 py-1 border border-gray-700/40">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[9px] text-gray-300 font-mono">{onlineCount}/4 activos</span>
        </div>
      </div>

      {/* Stats ribbon */}
      <div className="absolute bottom-0 left-0 right-0 h-6 bg-black/60 backdrop-blur-sm border-t border-gray-700/30 flex items-center justify-center gap-4 sm:gap-8 z-10">
        <span className="text-[9px] text-gray-500 font-mono">MSG <span className="text-cyan-400 font-bold">{stats.messages}</span></span>
        <span className="text-[9px] text-gray-500 font-mono">LEADS <span className="text-yellow-400 font-bold">{stats.leads}</span></span>
        <span className="text-[9px] text-gray-500 font-mono">VENTAS <span className="text-green-400 font-bold">{stats.sales}</span></span>
        <span className="text-[9px] text-gray-500 font-mono">CITAS <span className="text-blue-400 font-bold">{stats.appointments}</span></span>
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: i % 2 === 0 ? 2 : 1.5,
              height: i % 2 === 0 ? 2 : 1.5,
              backgroundColor: ['#67e8f9', '#a78bfa', '#4ade80', '#fbbf24'][i % 4],
              opacity: 0.4,
              left: `${8 + i * 12}%`,
              animation: `eveParticle ${4 + i * 0.6}s linear infinite`,
              animationDelay: `${i * 0.9}s`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes eveFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes eveShadow {
          0%, 100% { transform: translateX(-50%) scale(1); opacity: 0.7; }
          50% { transform: translateX(-50%) scale(0.7); opacity: 0.4; }
        }
        @keyframes eveEyeBlink {
          0%, 45%, 47%, 100% { transform: scaleY(1); }
          46% { transform: scaleY(0.1); }
        }
        @keyframes eveArmL {
          0%, 100% { transform: rotate(5deg); }
          50% { transform: rotate(-15deg); }
        }
        @keyframes eveArmR {
          0%, 100% { transform: rotate(-5deg); }
          50% { transform: rotate(15deg); }
        }
        @keyframes eveNotif {
          0%, 100% { transform: translateY(0) scale(1); opacity: 1; }
          50% { transform: translateY(-4px) scale(1.15); opacity: 0.7; }
        }
        @keyframes eveParticle {
          0% { transform: translateY(260px); opacity: 0; }
          15% { opacity: 0.5; }
          85% { opacity: 0.3; }
          100% { transform: translateY(-20px); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
