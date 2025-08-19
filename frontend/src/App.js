import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import { Toaster } from './components/ui/toaster';
import { useToast } from './hooks/use-toast';
import { ShoppingCart, User, Package, Mail, Star, ArrowRight, Palette, Video, BookOpen, Users } from 'lucide-react';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { Input } from './components/ui/input';
import { Textarea } from './components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerNote, setCustomerNote] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API}/products`);
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        title: 'Error',
        description: 'Failed to load products',
        variant: 'destructive',
      });
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${API}/orders`);
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({
        title: 'Error',
        description: 'Failed to load orders',
        variant: 'destructive',
      });
    }
  };

  const addToCart = (product, selectedOptions = null) => {
    const existingItem = cart.find(item => 
      item.product_id === product.id && 
      JSON.stringify(item.selected_options) === JSON.stringify(selectedOptions)
    );

    if (existingItem) {
      setCart(cart.map(item =>
        item.product_id === product.id && JSON.stringify(item.selected_options) === JSON.stringify(selectedOptions)
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, {
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        price: product.price,
        selected_options: selectedOptions
      }]);
    }

    toast({
      title: 'Added to cart',
      description: `${product.name} has been added to your cart`,
    });
  };

  const removeFromCart = (index) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const updateQuantity = (index, quantity) => {
    if (quantity === 0) {
      removeFromCart(index);
      return;
    }
    setCart(cart.map((item, i) => i === index ? { ...item, quantity } : item));
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const handleCheckout = async () => {
    if (!customerEmail) {
      toast({
        title: 'Email required',
        description: 'Please enter your email address',
        variant: 'destructive',
      });
      return;
    }

    if (cart.length === 0) {
      toast({
        title: 'Cart is empty',
        description: 'Please add items to your cart before checkout',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const orderData = {
        customer_email: customerEmail,
        customer_note: customerNote,
        items: cart
      };

      await axios.post(`${API}/orders`, orderData);
      
      // Clear cart and form
      setCart([]);
      setCustomerEmail('');
      setCustomerNote('');
      setIsCheckoutOpen(false);

      toast({
        title: 'Order placed successfully!',
        description: 'We will send you the invoice in your email shortly, and will be in touch with you via email.',
        duration: 5000,
      });
    } catch (error) {
      console.error('Error creating order:', error);
      toast({
        title: 'Error',
        description: 'Failed to place order. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const ProductCard = ({ product }) => {
    const [selectedStyle, setSelectedStyle] = useState('');
    
    const handleAddToCart = () => {
      let options = null;
      if (product.category === 'art' && selectedStyle) {
        const style = product.options?.styles?.find(s => s.name === selectedStyle);
        options = { style: style };
      } else if (product.options) {
        options = product.options;
      }
      addToCart(product, options);
    };

    const getCategoryIcon = (category) => {
      switch (category) {
        case 'design': return <Palette className="h-5 w-5" />;
        case 'art': return <Star className="h-5 w-5" />;
        case 'video': return <Video className="h-5 w-5" />;
        case 'course': return <BookOpen className="h-5 w-5" />;
        default: return <Package className="h-5 w-5" />;
      }
    };

    return (
      <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm">
        <div className="aspect-video overflow-hidden rounded-t-lg">
          <img 
            src={product.image_url} 
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="w-fit">
              {getCategoryIcon(product.category)}
              <span className="ml-1 capitalize">{product.category}</span>
            </Badge>
            <span className="text-2xl font-bold text-emerald-600">${product.price}</span>
          </div>
          <CardTitle className="text-xl group-hover:text-emerald-600 transition-colors">
            {product.name}
          </CardTitle>
          <CardDescription className="text-gray-600">
            {product.description}
          </CardDescription>
        </CardHeader>
        
        {product.category === 'art' && product.options?.styles && (
          <CardContent>
            <div className="space-y-2">
              <label className="text-sm font-medium">Choose Art Style:</label>
              <Select onValueChange={setSelectedStyle}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an art style" />
                </SelectTrigger>
                <SelectContent>
                  {product.options.styles.map((style, index) => (
                    <SelectItem key={index} value={style.name}>
                      <div>
                        <div className="font-medium">{style.name}</div>
                        <div className="text-xs text-gray-500">{style.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        )}
        
        <CardFooter>
          <Button 
            onClick={handleAddToCart}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
            disabled={product.category === 'art' && !selectedStyle}
          >
            Add to Cart
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
    );
  };

  const CartDrawer = () => (
    <Dialog open={isCartOpen} onOpenChange={setIsCartOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <ShoppingCart className="mr-2 h-5 w-5" />
            Shopping Cart ({cart.length})
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {cart.length === 0 ? (
            <p className="text-center text-gray-500">Your cart is empty</p>
          ) : (
            cart.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium">{item.product_name}</h4>
                  {item.selected_options?.style && (
                    <p className="text-sm text-gray-500">Style: {item.selected_options.style.name}</p>
                  )}
                  <p className="text-sm text-emerald-600 font-semibold">${item.price}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateQuantity(index, item.quantity - 1)}
                  >
                    -
                  </Button>
                  <span className="w-8 text-center">{item.quantity}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateQuantity(index, item.quantity + 1)}
                  >
                    +
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
        
        {cart.length > 0 && (
          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg font-semibold">Total: ${getCartTotal().toFixed(2)}</span>
            </div>
            <Button 
              onClick={() => {
                setIsCartOpen(false);
                setIsCheckoutOpen(true);
              }}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
            >
              Proceed to Checkout
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );

  const CheckoutModal = () => (
    <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Checkout</DialogTitle>
          <DialogDescription>
            Complete your order details below
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Email Address *</label>
            <Input
              type="email"
              placeholder="your@email.com"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              className="mt-1"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">Additional Notes (Optional)</label>
            <Textarea
              placeholder="Any special requirements or notes for your order..."
              value={customerNote}
              onChange={(e) => setCustomerNote(e.target.value)}
              className="mt-1"
              rows={3}
            />
          </div>
          
          <div className="border-t pt-4">
            <h3 className="font-medium mb-2">Order Summary</h3>
            {cart.map((item, index) => (
              <div key={index} className="flex justify-between text-sm py-1">
                <span>{item.product_name} x{item.quantity}</span>
                <span>${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            <div className="flex justify-between font-semibold text-lg border-t pt-2 mt-2">
              <span>Total:</span>
              <span>${getCartTotal().toFixed(2)}</span>
            </div>
          </div>
          
          <Button 
            onClick={handleCheckout}
            disabled={loading}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
          >
            {loading ? 'Processing...' : 'Place Order'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  const AdminPanel = () => (
    <Dialog open={isAdminOpen} onOpenChange={(open) => {
      setIsAdminOpen(open);
      if (open) fetchOrders();
    }}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <User className="mr-2 h-5 w-5" />
            Admin Panel
          </DialogTitle>
        </DialogHeader>
        
        <div className="overflow-y-auto">
          {orders.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No orders yet</p>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <Card key={order.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-sm">Order #{order.id.slice(-8)}</CardTitle>
                        <CardDescription>
                          <div className="flex items-center mt-1">
                            <Mail className="h-3 w-3 mr-1" />
                            {order.customer_email}
                          </div>
                          <div className="text-xs mt-1">
                            {new Date(order.created_at).toLocaleString()}
                          </div>
                        </CardDescription>
                      </div>
                      <Badge variant="outline">${order.total_amount.toFixed(2)}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Items:</h4>
                      {order.items.map((item, index) => (
                        <div key={index} className="flex justify-between text-sm bg-gray-50 p-2 rounded">
                          <span>{item.product_name} x{item.quantity}</span>
                          <span>${(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                      {order.customer_note && (
                        <div className="mt-2">
                          <h4 className="font-medium text-sm">Customer Note:</h4>
                          <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded mt-1">
                            {order.customer_note}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={
            <div>
              {/* Header */}
              <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="flex justify-between items-center h-16">
                    <div className="flex items-center">
                      <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                        PixelProducts
                      </h1>
                    </div>
                    <nav className="flex items-center space-x-4">
                      <Button
                        variant="ghost"
                        onClick={() => setIsCartOpen(true)}
                        className="relative"
                      >
                        <ShoppingCart className="h-5 w-5" />
                        {cart.length > 0 && (
                          <span className="absolute -top-2 -right-2 bg-emerald-500 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center">
                            {cart.length}
                          </span>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => setIsAdminOpen(true)}
                      >
                        <User className="h-5 w-5" />
                      </Button>
                    </nav>
                  </div>
                </div>
              </header>

              {/* Hero Section */}
              <section className="relative py-20 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto text-center">
                  <div className="relative">
                    <img 
                      src="https://images.unsplash.com/photo-1705056509266-c80d38d564e4" 
                      alt="Creative Services"
                      className="absolute inset-0 w-full h-full object-cover rounded-2xl opacity-10"
                    />
                    <div className="relative z-10 bg-white/80 backdrop-blur-sm rounded-2xl p-12 border">
                      <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
                        Premium Digital Services
                      </h1>
                      <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
                        Transform your ideas into reality with our professional design, art, video editing, and educational services.
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-2xl mx-auto">
                        <div className="text-center">
                          <div className="bg-emerald-100 rounded-full p-4 w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                            <Palette className="h-8 w-8 text-emerald-600" />
                          </div>
                          <p className="text-sm font-medium">Logo Design</p>
                        </div>
                        <div className="text-center">
                          <div className="bg-teal-100 rounded-full p-4 w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                            <Star className="h-8 w-8 text-teal-600" />
                          </div>
                          <p className="text-sm font-medium">Art Creation</p>
                        </div>
                        <div className="text-center">
                          <div className="bg-cyan-100 rounded-full p-4 w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                            <Video className="h-8 w-8 text-cyan-600" />
                          </div>
                          <p className="text-sm font-medium">Video Editing</p>
                        </div>
                        <div className="text-center">
                          <div className="bg-emerald-100 rounded-full p-4 w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                            <BookOpen className="h-8 w-8 text-emerald-600" />
                          </div>
                          <p className="text-sm font-medium">Courses</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Products Grid */}
              <section className="py-16 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                  <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Services</h2>
                    <p className="text-gray-600 max-w-2xl mx-auto">
                      Choose from our range of professional digital services, each crafted with expertise and attention to detail.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {products.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                </div>
              </section>

              {/* Footer */}
              <footer className="bg-gray-900 text-white py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="text-center">
                    <h3 className="text-2xl font-bold mb-4">PixelProducts</h3>
                    <p className="text-gray-400 mb-8">Premium digital services for your creative needs</p>
                    <div className="flex justify-center space-x-6">
                      <div className="flex items-center">
                        <Users className="h-5 w-5 mr-2" />
                        <span>Professional Team</span>
                      </div>
                      <div className="flex items-center">
                        <Star className="h-5 w-5 mr-2" />
                        <span>Quality Guaranteed</span>
                      </div>
                      <div className="flex items-center">
                        <Mail className="h-5 w-5 mr-2" />
                        <span>24/7 Support</span>
                      </div>
                    </div>
                  </div>
                </div>
              </footer>

              {/* Modals */}
              <CartDrawer />
              <CheckoutModal />
              <AdminPanel />
              
              <Toaster />
            </div>
          } />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;