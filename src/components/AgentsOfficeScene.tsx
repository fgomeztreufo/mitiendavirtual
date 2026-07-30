import { useMemo } from 'react'

interface AgentsOfficeSceneProps {
  igActive: boolean
  waActive: boolean
  tgActive: boolean
  calActive: boolean
  igMessage: boolean
  waMessage: boolean
  tgMessage: boolean
  calMessage: boolean
  stats: { messages: number; leads: number; sales: number; appointments: number }
}

function ChannelLogo({ type, size = 14, color = "white" }: { type: string; size?: number, color?: string }) {
  if (type === 'whatsapp') return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill={color} style={{ imageRendering: 'pixelated' }}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
    </svg>
  )
  if (type === 'instagram') return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth="3" style={{ imageRendering: 'pixelated' }}>
      <rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="12" cy="12" r="4"/>
    </svg>
  )
  if (type === 'telegram') return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill={color} style={{ imageRendering: 'pixelated' }}>
      <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
    </svg>
  )
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth="2.5" style={{ imageRendering: 'pixelated' }}>
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
      <text x="12" y="18" textAnchor="middle" fill={color} stroke="none" fontSize="8" fontWeight="bold">21</text>
    </svg>
  )
}

export default function AgentsOfficeScene({
  igActive, waActive, tgActive, calActive,
  igMessage, waMessage, tgMessage, calMessage,
  stats,
}: AgentsOfficeSceneProps) {

  const agents = useMemo(() => [
    { id: 'wa', label: 'WHATSAPP', active: waActive, hasMessage: waMessage, color: '#4ade80', bg: '#16a34a', logo: 'whatsapp', delay: 0 },
    { id: 'ig', label: 'INSTAGRAM', active: igActive, hasMessage: igMessage, color: '#f43f5e', bg: '#be123c', logo: 'instagram', delay: 0.15 },
    { id: 'tg', label: 'TELEGRAM', active: tgActive, hasMessage: tgMessage, color: '#38bdf8', bg: '#0369a1', logo: 'telegram', delay: 0.3 },
    { id: 'cal', label: 'CALENDAR', active: calActive, hasMessage: calMessage, color: '#60a5fa', bg: '#1d4ed8', logo: 'calendar', delay: 0.45 },
  ], [igActive, waActive, tgActive, calActive, igMessage, waMessage, tgMessage, calMessage])

  const onlineCount = [igActive, waActive, tgActive, calActive].filter(Boolean).length

  return (
    <div
      className="relative w-full overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.8)] rounded-xl"
      style={{ 
        height: 480, 
        backgroundColor: '#0a0a0f', 
        border: '4px solid #334155',
        fontFamily: "'Courier New', Courier, monospace" 
      }}
    >
      {/* 32-bit Background Grid (Mode 7 Style) */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(59, 130, 246, 0.15) 2px, transparent 2px), linear-gradient(90deg, rgba(59, 130, 246, 0.15) 2px, transparent 2px)',
        backgroundSize: '32px 16px',
        transform: 'perspective(400px) rotateX(65deg) translateY(50px) translateZ(-150px)',
        opacity: 0.6
      }} />

      {/* Main Cubicles Container */}
      <div className="absolute inset-0 flex justify-center items-center px-4 gap-1 sm:gap-4 pb-12">
        {agents.map((agent, i) => {
          const isOff = !agent.active
          const isWorking = agent.active && agent.hasMessage
          const isSleeping = agent.active && !agent.hasMessage

          // 32-bit restricted color palette logic
          const stroke = "#0f172a"
          const strokeW = "3" // Thicker outlines for that retro sprite look
          const floor = isOff ? "#1a1f2e" : "#5a6680"
          const wallL = isOff ? "#121623" : "#7b88a5"
          const wallR = isOff ? "#0d101a" : "#606d8a"
          const deskTop = isOff ? "#261a14" : "#b58756"
          const deskSide = isOff ? "#170f0b" : "#7d5c38"

          return (
            <div key={agent.id} className="relative flex-1 max-w-[280px] h-full flex flex-col justify-center">
              
              <svg viewBox="0 0 200 240" className="w-full h-auto overflow-visible" style={{ filter: isOff ? 'brightness(0.4) contrast(1.2)' : 'brightness(1.1) contrast(1.1)' }}>
                
                <defs>
                  {/* Drop shadow for 32-bit realism */}
                  <filter id={`shadow-${agent.id}`} x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="8" stdDeviation="4" floodColor="#000" floodOpacity="0.4"/>
                  </filter>
                </defs>

                {/* ================= BACKGROUND ROOM ================= */}
                {/* Floor */}
                <polygon points="100,220 10,168 100,116 190,168" fill={floor} stroke={stroke} strokeWidth={strokeW} strokeLinejoin="round" />
                {/* Desk Shadow on Floor */}
                <polygon points="100,185 30,145 90,115 150,150" fill="rgba(0,0,0,0.25)" />
                
                {/* Left Wall */}
                <polygon points="10,168 100,220 100,80 10,28" fill={wallL} stroke={stroke} strokeWidth={strokeW} strokeLinejoin="round" />
                {/* Right Wall */}
                <polygon points="100,220 190,168 190,28 100,80" fill={wallR} stroke={stroke} strokeWidth={strokeW} strokeLinejoin="round" />
                {/* Back Corner Line */}
                <line x1="100" y1="80" x2="100" y2="220" stroke={stroke} strokeWidth="2" opacity="0.5" />

                {/* ================= DESK ================= */}
                <g filter={`url(#shadow-${agent.id})`}>
                  {/* Left Drawer / Leg */}
                  <polygon points="20,160 45,174 45,190 20,176" fill={deskSide} stroke={stroke} strokeWidth={strokeW} strokeLinejoin="round" />
                  <polygon points="45,174 70,160 70,176 45,190" fill="#997047" stroke={stroke} strokeWidth={strokeW} strokeLinejoin="round" />
                  {/* Right Drawer / Leg */}
                  <polygon points="120,132 145,146 145,162 120,148" fill={deskSide} stroke={stroke} strokeWidth={strokeW} strokeLinejoin="round" />
                  <polygon points="145,146 170,132 170,148 145,162" fill="#997047" stroke={stroke} strokeWidth={strokeW} strokeLinejoin="round" />
                  {/* Desk Top */}
                  <polygon points="100,168 15,118 80,82 165,132" fill={deskTop} stroke={stroke} strokeWidth={strokeW} strokeLinejoin="round" />
                  {/* Desk Thickness (Front edge) */}
                  <polygon points="15,118 100,168 100,174 15,124" fill="#997047" stroke={stroke} strokeWidth={strokeW} strokeLinejoin="round" />
                  <polygon points="100,168 165,132 165,138 100,174" fill={deskSide} stroke={stroke} strokeWidth={strokeW} strokeLinejoin="round" />
                </g>

                {/* ================= MONITOR ================= */}
                <g transform="translate(45, 80)">
                  {/* CRT Shadow */}
                  <polygon points="10,38 45,26 65,30 25,48" fill="rgba(0,0,0,0.3)" />
                  {/* CRT Back/Box */}
                  <polygon points="20,10 -5,22 15,36 40,24" fill={isOff ? "#1e293b" : "#cbd5e1"} stroke={stroke} strokeWidth={strokeW} strokeLinejoin="round" />
                  <polygon points="15,36 40,24 40,-10 15,2" fill={isOff ? "#0f172a" : "#94a3b8"} stroke={stroke} strokeWidth={strokeW} strokeLinejoin="round" />
                  <polygon points="40,24 65,10 65,-24 40,-10" fill={isOff ? "#020617" : "#64748b"} stroke={stroke} strokeWidth={strokeW} strokeLinejoin="round" />
                  {/* CRT Screen Frame */}
                  <polygon points="17,32 38,20 38,-6 17,6" fill={isOff ? "#020617" : "#0f172a"} stroke={stroke} strokeWidth="3" strokeLinejoin="round" />
                  
                  {/* Screen Content */}
                  {!isOff && (
                    <>
                      <polygon points="18,30 37,19 37,-4 18,7" fill={agent.color} opacity="0.2" />
                      {isWorking && (
                        <g style={{ animation: 'screenFlicker 0.2s infinite alternate steps(2)' }}>
                           <line x1="22" y1="12" x2="32" y2="6" stroke={agent.color} strokeWidth="2" />
                           <line x1="22" y1="16" x2="34" y2="9" stroke={agent.color} strokeWidth="2" />
                           <line x1="22" y1="20" x2="28" y2="17" stroke={agent.color} strokeWidth="2" />
                        </g>
                      )}
                    </>
                  )}
                </g>

                {/* ================= ROBOT & CHAIR ================= */}
                {!isOff && (
                  <g>
                    {/* Shadow under robot */}
                    <ellipse cx="120" cy="180" rx="18" ry="9" fill="rgba(0,0,0,0.35)" />
                    
                    {/* Chair Base */}
                    <ellipse cx="120" cy="180" rx="14" ry="7" fill="#1e293b" stroke={stroke} strokeWidth="2" />
                    <rect x="117" y="155" width="6" height="25" fill="#334155" stroke={stroke} strokeWidth="2" />
                    <path d="M 100 155 Q 120 165 140 155" fill="none" stroke="#475569" strokeWidth="6" strokeLinecap="square" />

                    {/* ANIMATED ROBOT (Sprite-style steps animation) */}
                    <g 
                      style={{ 
                        transformOrigin: '120px 145px',
                        animation: isWorking 
                          ? `typingSprite 0.4s infinite alternate steps(2)` 
                          : isSleeping ? `sleepSprite 2.5s infinite alternate steps(3)` : 'none',
                        animationDelay: `${agent.delay}s`
                      }}
                    >
                      {/* Chair Backrest */}
                      <path d="M 132 155 L 145 130 L 152 135 L 139 160 Z" fill="#334155" stroke={stroke} strokeWidth="3" strokeLinejoin="round" />

                      {/* Robot Torso */}
                      <path d="M 115 155 C 105 140, 110 120, 125 120 C 135 120, 140 140, 130 155 Z" fill="#e2e8f0" stroke={stroke} strokeWidth={strokeW} strokeLinejoin="round" />
                      
                      {/* Logo on Torso */}
                      <g transform="translate(118, 130) scale(0.65) skewY(15)">
                        <circle cx="12" cy="12" r="10" fill={agent.bg} stroke={stroke} strokeWidth="2" />
                        <ChannelLogo type={agent.logo} size={16} />
                      </g>

                      {/* Robot Head */}
                      <g 
                        style={{
                           transformOrigin: '125px 120px',
                           transform: isSleeping ? 'rotate(15deg) translate(5px, 5px)' : 'rotate(-5deg)'
                        }}
                      >
                        <rect x="105" y="88" width="32" height="32" rx="4" fill="#f8fafc" stroke={stroke} strokeWidth={strokeW} />
                        <rect x="108" y="98" width="26" height="14" rx="2" fill="#0f172a" stroke={stroke} strokeWidth="2" />
                        {/* Eyes */}
                        {isWorking && (
                          <g style={{ animation: 'blinkSprite 3s infinite steps(1)' }}>
                            <rect x="112" y="102" width="6" height="6" fill="#38bdf8" />
                            <rect x="124" y="102" width="6" height="6" fill="#38bdf8" />
                          </g>
                        )}
                        {isSleeping && (
                          <>
                            <rect x="110" y="105" width="8" height="3" fill="#475569" />
                            <rect x="124" y="105" width="8" height="3" fill="#475569" />
                          </>
                        )}
                      </g>

                      {/* Robot Arms */}
                      {isWorking && (
                         <g>
                           {/* Left Arm */}
                           <path d="M 112 135 Q 100 145 95 135" fill="none" stroke="#e2e8f0" strokeWidth="6" strokeLinecap="square" 
                                 style={{ animation: 'armSpriteLeft 0.2s infinite alternate steps(2)' }} />
                           <path d="M 112 135 Q 100 145 95 135" fill="none" stroke={stroke} strokeWidth="9" strokeLinecap="square" style={{ mixBlendMode: 'destination-over' }} />
                           
                           {/* Right Arm */}
                           <path d="M 130 140 Q 115 155 105 145" fill="none" stroke="#cbd5e1" strokeWidth="6" strokeLinecap="square"
                                 style={{ animation: 'armSpriteRight 0.25s infinite alternate steps(2)' }} />
                           <path d="M 130 140 Q 115 155 105 145" fill="none" stroke={stroke} strokeWidth="9" strokeLinecap="square" style={{ mixBlendMode: 'destination-over' }} />
                         </g>
                      )}
                      {isSleeping && (
                         <g>
                           <path d="M 115 135 L 125 150" fill="none" stroke="#e2e8f0" strokeWidth="6" strokeLinecap="square" />
                           <path d="M 115 135 L 125 150" fill="none" stroke={stroke} strokeWidth="9" strokeLinecap="square" style={{ mixBlendMode: 'destination-over' }} />
                         </g>
                      )}
                    </g>
                  </g>
                )}

                {/* ================= FLOOR LOGO ================= */}
                <g transform="translate(100, 205)">
                   <ellipse cx="0" cy="0" rx="35" ry="12" fill={agent.bg} opacity={isOff ? "0.1" : "0.4"} filter="blur(2px)" />
                   <text x="0" y="2" textAnchor="middle" fill={isOff ? "#334155" : "#f8fafc"} fontSize="13" fontWeight="900" style={{ textShadow: isOff ? 'none' : `0 2px 0 #000, 0 0 10px ${agent.color}` }}>
                     {agent.label}
                   </text>
                </g>

                {/* ================= STATUS BUBBLES ================= */}
                {isWorking && (
                  <g style={{ animation: `bounceSprite 1s infinite alternate steps(4)`, animationDelay: `${agent.delay}s` }}>
                    <path d="M 125 45 C 125 25, 160 25, 160 45 C 160 55, 142 65, 142 80 L 136 80 C 136 65, 125 60, 125 45 Z" fill={agent.bg} stroke={stroke} strokeWidth="3" strokeLinejoin="round" />
                    <text x="142.5" y="58" textAnchor="middle" fill="white" fontSize="24" fontWeight="900">!</text>
                  </g>
                )}

                {isSleeping && (
                  <g style={{ animation: `floatSprite 2s infinite linear steps(4)`, animationDelay: `${agent.delay}s` }}>
                    <rect x="135" y="30" width="45" height="25" fill="#f8fafc" stroke={stroke} strokeWidth="3" />
                    <text x="157" y="48" textAnchor="middle" fill={stroke} fontSize="16" fontWeight="bold">Zzz</text>
                  </g>
                )}
              </svg>
            </div>
          )
        })}
      </div>

      {/* ================= CRT OVERLAY EFFECTS ================= */}
      <div className="absolute inset-0 pointer-events-none z-20" style={{
        background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))',
        backgroundSize: '100% 4px, 3px 100%',
        boxShadow: 'inset 0 0 100px rgba(0,0,0,0.9)'
      }} />

      {/* Arcade HUD - Top Left */}
      <div className="absolute top-4 left-6 z-30 flex items-center gap-3">
        <div className="w-4 h-4 bg-green-400 border-2 border-slate-900 shadow-[0_0_15px_#4ade80]" style={{ animation: 'blinkSprite 1s infinite steps(1)' }} />
        <span className="text-lg text-white font-black drop-shadow-[0_2px_0_#000]" style={{ textShadow: '2px 2px 0 #000' }}>{onlineCount}/4 ACTIVOS</span>
      </div>

      {/* Arcade HUD - Bottom Stats Ribbon */}
      <div className="absolute bottom-0 left-0 right-0 h-14 bg-black/80 border-t-4 border-slate-700 flex items-center justify-center gap-4 sm:gap-10 z-30">
        <span className="text-sm md:text-base text-slate-300 font-bold" style={{ textShadow: '2px 2px 0 #000' }}>
          MSG <span className="text-sky-400 ml-1">{stats.messages.toString().padStart(5, '0')}</span>
        </span>
        <span className="text-sm md:text-base text-slate-300 font-bold" style={{ textShadow: '2px 2px 0 #000' }}>
          LEADS <span className="text-yellow-400 ml-1">{stats.leads.toString().padStart(3, '0')}</span>
        </span>
        <span className="text-sm md:text-base text-slate-300 font-bold" style={{ textShadow: '2px 2px 0 #000' }}>
          VENTAS <span className="text-green-400 ml-1">{stats.sales.toString().padStart(3, '0')}</span>
        </span>
        <span className="text-sm md:text-base text-slate-300 font-bold" style={{ textShadow: '2px 2px 0 #000' }}>
          CITAS <span className="text-indigo-400 ml-1">{stats.appointments.toString().padStart(3, '0')}</span>
        </span>
      </div>

      {/* Animations CSS */}
      <style>{`
        @keyframes typingSprite {
          0% { transform: rotate(0deg) translate(0, 0); }
          100% { transform: rotate(3deg) translate(2px, 2px); }
        }
        @keyframes sleepSprite {
          0%, 100% { transform: rotate(10deg) translate(5px, 8px); }
          50% { transform: rotate(14deg) translate(6px, 10px); }
        }
        @keyframes bounceSprite {
          0% { transform: translateY(0); }
          100% { transform: translateY(-10px); }
        }
        @keyframes floatSprite {
          0% { transform: translateY(15px); opacity: 0; }
          25% { opacity: 1; }
          75% { opacity: 1; }
          100% { transform: translateY(-25px); opacity: 0; }
        }
        @keyframes armSpriteLeft {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(-12deg) translateY(4px); }
        }
        @keyframes armSpriteRight {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(12deg) translateY(-4px); }
        }
        @keyframes blinkSprite {
          0%, 90% { opacity: 1; }
          95% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes screenFlicker {
          0% { opacity: 0.8; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  )
}