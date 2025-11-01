"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Upload, 
  X, 
  Camera, 
  Heart,
  ShoppingBag,
  Search,
  Image as ImageIcon,
  Calendar
} from "lucide-react"
import { demoProducts } from "@/lib/demo-products"

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<"profile" | "generations">("profile")
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [tryOnImage, setTryOnImage] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@example.com",
    phone: "+1 (555) 123-4567",
    address: "123 Main Street",
    city: "New York",
    state: "NY",
    zipCode: "10001",
    country: "United States",
    dateOfBirth: "1990-01-15",
    gender: "Male"
  })

  const handleImageUpload = (type: "profile" | "tryon", event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        if (type === "profile") {
          setProfileImage(reader.result as string)
        } else {
          setTryOnImage(reader.result as string)
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const dummyGenerations = [
    {
      id: "gen-1",
      productId: "nike-vomero-plus",
      productName: "Nike Vomero Premium",
      image: demoProducts[0]?.images[0] || "/placeholder.svg",
      generatedAt: "2024-01-15T10:30:00Z",
      status: "completed"
    },
    {
      id: "gen-2",
      productId: "nike-winter-jacket",
      productName: "Nike Club Seasonal Winter Jacket",
      image: demoProducts[2]?.images[0] || "/placeholder.svg",
      generatedAt: "2024-01-14T14:20:00Z",
      status: "completed"
    },
    {
      id: "gen-3",
      productId: "luxury-chronograph-watch",
      productName: "Premium Chronograph Watch",
      image: demoProducts[6]?.images[0] || "/placeholder.svg",
      generatedAt: "2024-01-13T09:15:00Z",
      status: "completed"
    },
    {
      id: "gen-4",
      productId: "lv-clash-sunglasses",
      productName: "Louis Vuitton LV Clash Square Sunglasses",
      image: demoProducts[7]?.images[0] || "/placeholder.svg",
      generatedAt: "2024-01-12T16:45:00Z",
      status: "completed"
    },
    {
      id: "gen-5",
      productId: "michael-kors-handbag",
      productName: "Michael Kors Signature Tote",
      image: demoProducts[5]?.images[0] || "/placeholder.svg",
      generatedAt: "2024-01-11T11:30:00Z",
      status: "completed"
    },
    {
      id: "gen-6",
      productId: "brooklyn-hockey-jersey",
      productName: "Brooklyn Collegiate Hockey Jersey",
      image: demoProducts[4]?.images[0] || "/placeholder.svg",
      generatedAt: "2024-01-10T13:20:00Z",
      status: "completed"
    }
  ]

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", { 
      year: "numeric", 
      month: "short", 
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    })
  }

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

      {/* Profile Content */}
      <div className="container mx-auto px-6 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Page Title */}
          <h1 className="text-3xl font-bold mb-8">My Profile</h1>

          {/* Tabs */}
          <div className="border-b border-neutral-200 mb-8">
            <div className="flex gap-8">
              <button
                onClick={() => setActiveTab("profile")}
                className={`pb-4 px-1 font-medium text-base transition-colors ${
                  activeTab === "profile"
                    ? "text-black border-b-2 border-black"
                    : "text-neutral-500 hover:text-neutral-700"
                }`}
              >
                Profile
              </button>
              <button
                onClick={() => setActiveTab("generations")}
                className={`pb-4 px-1 font-medium text-base transition-colors ${
                  activeTab === "generations"
                    ? "text-black border-b-2 border-black"
                    : "text-neutral-500 hover:text-neutral-700"
                }`}
              >
                Past Generation
              </button>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === "profile" && (
            <div className="space-y-8">
              {/* Profile Information Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Profile Picture */}
                    <div className="flex items-center gap-6">
                      <div className="relative">
                        <div className="w-24 h-24 rounded-full bg-neutral-200 flex items-center justify-center overflow-hidden">
                          {profileImage ? (
                            <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                          ) : (
                            <User className="h-12 w-12 text-neutral-400" />
                          )}
                        </div>
                        <label className="absolute bottom-0 right-0 bg-black text-white p-2 rounded-full cursor-pointer hover:bg-neutral-800 transition-colors">
                          <Camera className="h-4 w-4" />
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleImageUpload("profile", e)}
                          />
                        </label>
                      </div>
                      <div>
                        <p className="font-medium text-base mb-1">Profile Picture</p>
                        <p className="text-sm text-neutral-600">Upload your profile picture</p>
                      </div>
                    </div>

                    {/* Form Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          value={formData.firstName}
                          onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          value={formData.lastName}
                          onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">
                          <Mail className="h-4 w-4 inline mr-2" />
                          Email Address
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone">
                          <Phone className="h-4 w-4 inline mr-2" />
                          Phone Number
                        </Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="dateOfBirth">Date of Birth</Label>
                        <Input
                          id="dateOfBirth"
                          type="date"
                          value={formData.dateOfBirth}
                          onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="gender">Gender</Label>
                        <Input
                          id="gender"
                          value={formData.gender}
                          onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Address Information Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Address Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <Label htmlFor="address">
                        <MapPin className="h-4 w-4 inline mr-2" />
                        Street Address
                      </Label>
                      <Input
                        id="address"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">State/Province</Label>
                      <Input
                        id="state"
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="zipCode">Zip/Postal Code</Label>
                      <Input
                        id="zipCode"
                        value={formData.zipCode}
                        onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="country">Country</Label>
                      <Input
                        id="country"
                        value={formData.country}
                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Virtual Try-On Section */}
              <Card className="border-2 border-neutral-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="h-5 w-5" />
                    Virtual Try-On
                  </CardTitle>
                  <p className="text-sm text-neutral-600 mt-2">
                    Upload your image to see how products will look on you. This helps us automatically show how products fit when you try them on.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="flex items-center gap-6">
                      <div className="relative">
                        <div className="w-48 h-48 rounded-lg bg-neutral-100 border-2 border-dashed border-neutral-300 flex items-center justify-center overflow-hidden">
                          {tryOnImage ? (
                            <>
                              <img src={tryOnImage} alt="Try-on" className="w-full h-full object-cover" />
                              <button
                                onClick={() => setTryOnImage(null)}
                                className="absolute top-2 right-2 bg-black text-white p-1 rounded-full hover:bg-neutral-800 transition-colors"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <div className="text-center p-6">
                              <Upload className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
                              <p className="text-sm text-neutral-600 mb-2">Upload Your Image</p>
                              <p className="text-xs text-neutral-500">One image of yourself</p>
                            </div>
                          )}
                        </div>
                        {!tryOnImage && (
                          <label className="absolute inset-0 cursor-pointer">
                            <input
                              id="tryon-image-input"
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleImageUpload("tryon", e)}
                            />
                          </label>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-base mb-2">How it works:</h3>
                        <ul className="space-y-2 text-sm text-neutral-600">
                          <li className="flex items-start gap-2">
                            <span className="text-neutral-400">•</span>
                            <span>Upload one clear image of yourself (face and upper body visible)</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-neutral-400">•</span>
                            <span>Our AI will automatically visualize products on you</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-neutral-400">•</span>
                            <span>See how products look before you buy</span>
                          </li>
                        </ul>
                        {!tryOnImage && (
                          <label htmlFor="tryon-image-input" className="inline-block mt-4">
                            <Button
                              type="button"
                              className="cursor-pointer"
                              onClick={(e) => {
                                e.preventDefault()
                                document.getElementById("tryon-image-input")?.click()
                              }}
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              Upload Image
                            </Button>
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Save Button */}
              <div className="flex justify-end">
                <Button size="lg" className="px-8">
                  Save Changes
                </Button>
              </div>
            </div>
          )}

          {activeTab === "generations" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Past Generations</h2>
                  <p className="text-neutral-600">View all your previous virtual try-on generations</p>
                </div>
              </div>

              {/* Generations Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {dummyGenerations.map((generation) => (
                  <Card key={generation.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                    <div className="aspect-square bg-neutral-100 relative overflow-hidden">
                      <img
                        src={generation.image}
                        alt={generation.productName}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                        <ImageIcon className="h-3 w-3" />
                        Generated
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-medium text-base mb-2 line-clamp-2">{generation.productName}</h3>
                      <div className="flex items-center gap-2 text-sm text-neutral-600">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(generation.generatedAt)}</span>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1">
                          View Details
                        </Button>
                        <Button size="sm" className="flex-1">
                          Try Again
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {dummyGenerations.length === 0 && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <ImageIcon className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Generations Yet</h3>
                    <p className="text-neutral-600 mb-6">Start trying on products to see your generations here</p>
                    <Link href="/">
                      <Button>Browse Products</Button>
                    </Link>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-black text-white py-12 mt-16">
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

