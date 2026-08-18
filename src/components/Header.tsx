import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'
import { siteConfig } from '../config/siteConfig'

const NAV_ITEMS = [
  { name: 'Canales', id: 'canales' },
  { name: 'Cómo funciona', id: 'como-funciona' },
  { name: 'Demo', id: 'demo' },
  { name: 'Planes', id: 'planes' },
  { name: 'FAQ', id: 'faq' },
]

interface HeaderProps {
  onLoginClick?: () => void
}

export default function Header({ onLoginClick }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' })
    setIsMenuOpen(false)
  }

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isScrolled ? 'bg-white shadow-lg' : 'bg-white/95 backdrop-blur-sm'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3">
            <img src="/images/logo.png" alt={siteConfig.company.name} className="h-10 w-10 md:h-12 md:w-12 object-contain" />
            <span className="text-lg md:text-xl font-bold text-gray-900">{siteConfig.company.name}</span>
          </div>

          <nav className="hidden md:flex items-center space-x-6">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors"
              >
                {item.name}
              </button>
            ))}
            {onLoginClick && (
              <button
                onClick={onLoginClick}
                className="ml-2 px-4 py-2 text-sm font-semibold text-white rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg active:scale-95"
              >
                Empezar gratis
              </button>
            )}
          </nav>

          <div className="md:hidden">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-gray-700 hover:text-indigo-600 transition-colors">
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {isMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 pb-4">
            <div className="flex flex-col space-y-1 pt-2">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className="px-4 py-2 text-left text-gray-600 hover:text-gray-900 hover:bg-gray-50 text-sm font-medium transition-colors rounded-lg"
                >
                  {item.name}
                </button>
              ))}
              {onLoginClick && (
                <div className="px-4 pt-2">
                  <button
                    onClick={() => { onLoginClick(); setIsMenuOpen(false) }}
                    className="w-full px-4 py-2.5 text-sm font-semibold text-white rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all active:scale-95"
                  >
                    Empezar gratis
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
