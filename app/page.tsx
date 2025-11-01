import Link from "next/link"
import { Button } from "@/components/ui/button"
import { demoProducts } from "@/lib/demo-products"
import { Search, Heart, ShoppingBag, User } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Top Utility Bar */}
      <div className="bg-neutral-100 border-b border-neutral-200">
        <div className="container mx-auto px-6 py-2">
          <div className="flex items-center justify-end gap-4 text-xs">
            <Link href="#" className="hover:text-neutral-600">
              Find a Store
            </Link>
            <span className="text-neutral-300">|</span>
            <Link href="#" className="hover:text-neutral-600">
              Help
            </Link>
            <span className="text-neutral-300">|</span>
            <Link href="#" className="hover:text-neutral-600">
              Join Us
            </Link>
            <span className="text-neutral-300">|</span>
            <Link href="#" className="hover:text-neutral-600">
              Sign In
            </Link>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className="bg-white sticky top-0 z-50 border-b border-neutral-200">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center">
              <svg className="h-16 w-16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 7.8L6.442 15.276c-1.456.616-2.679.925-3.668.925-1.12 0-1.933-.392-2.437-1.177-.317-.504-.41-1.143-.28-1.918.13-.775.476-1.6 1.036-2.478.467-.71 1.232-1.643 2.297-2.8a6.122 6.122 0 00-.784 1.848c-.13.653-.093 1.186.112 1.596.317.635 1.019.953 2.11.953.747 0 1.735-.28 2.966-.84L24 7.8z" />
              </svg>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-6 text-base font-medium">
              <Link href="#" className="hover:text-neutral-600 transition-colors">
                New & Featured
              </Link>
              <Link href="#" className="hover:text-neutral-600 transition-colors">
                Men
              </Link>
              <Link href="#" className="hover:text-neutral-600 transition-colors">
                Women
              </Link>
              <Link href="#" className="hover:text-neutral-600 transition-colors">
                Kids
              </Link>
              <Link href="#" className="hover:text-neutral-600 transition-colors">
                Sale
              </Link>
            </nav>

            {/* Right Actions */}
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center bg-neutral-100 rounded-full px-4 py-2 gap-2">
                <Search className="h-5 w-5 text-neutral-600" />
                <input
                  type="text"
                  placeholder="Search"
                  className="bg-transparent border-none outline-none text-sm w-40"
                />
              </div>
              <button className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
                <Heart className="h-6 w-6" />
              </button>
              <Link href="/profile" className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
                <User className="h-6 w-6" />
              </Link>
              <button className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
                <ShoppingBag className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative h-[600px] bg-neutral-100 overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
          aria-label="Virtual try-on technology showcase"
        >
          <source src="/Header_video.mp4" type="video/mp4" />
          {/* Fallback image if video doesn't load */}
          <img src="/placeholder.svg?height=600&width=1920" alt="Hero" className="w-full h-full object-cover" />
        </video>
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-black/30"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white drop-shadow-lg">
            <h1 className="text-6xl md:text-7xl font-black mb-6 tracking-tight">TRY BEFORE YOU BUY</h1>
            <p className="text-xl md:text-2xl mb-8 font-medium">Experience Virtual Try-On Technology</p>
            <Button
              size="lg"
              className="bg-black hover:bg-neutral-800 text-white rounded-full px-8 py-6 text-base font-medium"
            >
              Shop Now
            </Button>
          </div>
        </div>
      </section>

      {/* Featured Section */}
      

      {/* Products Section */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <h2 className="text-2xl font-bold mb-8">Shop The Classics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {demoProducts.slice(0, 8).map((product) => (
              <Link key={product.id} href={`/product/${product.id}`} className="group">
                <div className="bg-neutral-100 aspect-square mb-4 overflow-hidden">
                  <img
                    src={product.images[0] || "/placeholder.svg"}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-orange-600">Just In</p>
                  <h3 className="font-medium text-base">{product.name}</h3>
                  <p className="text-sm text-neutral-600">{product.category}</p>
                  <p className="text-sm text-neutral-600">1 Colour</p>
                  <p className="font-medium mt-2">MRP : ${product.price}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black text-white py-12">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-medium mb-4 text-sm">FIND A STORE</h4>
              <ul className="space-y-3 text-sm text-neutral-400">
                <li>
                  <Link href="#" className="hover:text-white">
                    Become A Member
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white">
                    Sign Up for Email
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white">
                    Send Us Feedback
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-4 text-sm">GET HELP</h4>
              <ul className="space-y-3 text-sm text-neutral-400">
                <li>
                  <Link href="#" className="hover:text-white">
                    Order Status
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white">
                    Delivery
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white">
                    Returns
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white">
                    Payment Options
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-4 text-sm">ABOUT</h4>
              <ul className="space-y-3 text-sm text-neutral-400">
                <li>
                  <Link href="#" className="hover:text-white">
                    News
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white">
                    Careers
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white">
                    Investors
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white">
                    Sustainability
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-neutral-800 pt-6 text-xs text-neutral-400">
            <p>© 2025 Closelook Demo Store. All Rights Reserved. Powered by Gemini AI.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
