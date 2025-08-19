import requests
import sys
import json
from datetime import datetime

class DigitalProductsAPITester:
    def __init__(self, base_url="https://pixelproducts.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.products = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}" if endpoint else f"{self.api_url}/"
        if headers is None:
            headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if endpoint == "products" and method == 'GET':
                        print(f"   Found {len(response_data)} products")
                        self.products = response_data
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Response text: {response.text[:200]}")
                return False, {}

        except requests.exceptions.Timeout:
            print(f"❌ Failed - Request timeout")
            return False, {}
        except requests.exceptions.ConnectionError:
            print(f"❌ Failed - Connection error")
            return False, {}
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_api_root(self):
        """Test API root endpoint"""
        return self.run_test("API Root", "GET", "", 200)

    def test_get_products(self):
        """Test getting all products"""
        success, data = self.run_test("Get All Products", "GET", "products", 200)
        if success and data:
            # Verify we have the expected 7 products
            expected_products = [
                ("Professional Logo Design", 25.0),
                ("Art Drawings - Photo to Art", 45.0),
                ("Video Editing - 1 Minute", 35.0),
                ("Video Editing - 5 Minutes", 75.0),
                ("Video Editing - 20+ Minutes", 120.0),
                ("Full Photoshop Course", 149.99),
                ("Full Adobe Premiere Course", 199.99)
            ]
            
            print(f"   Verifying product details...")
            for expected_name, expected_price in expected_products:
                found = any(p['name'] == expected_name and p['price'] == expected_price for p in data)
                if found:
                    print(f"   ✅ Found: {expected_name} - ${expected_price}")
                else:
                    print(f"   ❌ Missing: {expected_name} - ${expected_price}")
                    
            # Check Art Drawings has style options
            art_product = next((p for p in data if "Art Drawings" in p['name']), None)
            if art_product and art_product.get('options', {}).get('styles'):
                styles = [s['name'] for s in art_product['options']['styles']]
                expected_styles = ["Oil Painting", "Vector / Flat Design", "Anime / Manga", "Impressionism", "Cyberpunk"]
                print(f"   Art styles available: {styles}")
                for style in expected_styles:
                    if style in styles:
                        print(f"   ✅ Style found: {style}")
                    else:
                        print(f"   ❌ Style missing: {style}")
        
        return success

    def test_get_single_product(self):
        """Test getting a single product by ID"""
        if not self.products:
            print("❌ No products available for single product test")
            return False
            
        product_id = self.products[0]['id']
        return self.run_test("Get Single Product", "GET", f"products/{product_id}", 200)

    def test_get_nonexistent_product(self):
        """Test getting a non-existent product"""
        return self.run_test("Get Non-existent Product", "GET", "products/nonexistent-id", 404)

    def test_create_order(self):
        """Test creating an order"""
        if not self.products:
            print("❌ No products available for order test")
            return False

        # Create test order with multiple items
        order_data = {
            "customer_email": f"test_{datetime.now().strftime('%H%M%S')}@example.com",
            "customer_note": "Test order from API testing",
            "items": [
                {
                    "product_id": self.products[0]['id'],
                    "product_name": self.products[0]['name'],
                    "quantity": 2,
                    "price": self.products[0]['price'],
                    "selected_options": None
                }
            ]
        }
        
        # Add art product with style selection if available
        art_product = next((p for p in self.products if "Art Drawings" in p['name']), None)
        if art_product:
            order_data["items"].append({
                "product_id": art_product['id'],
                "product_name": art_product['name'],
                "quantity": 1,
                "price": art_product['price'],
                "selected_options": {
                    "style": {
                        "name": "Oil Painting",
                        "description": "Timeless, textured, rich colors (Van Gogh, Rembrandt style)"
                    }
                }
            })

        success, response_data = self.run_test("Create Order", "POST", "orders", 200, order_data)
        
        if success and response_data:
            print(f"   Order ID: {response_data.get('id', 'N/A')}")
            print(f"   Total Amount: ${response_data.get('total_amount', 0)}")
            self.test_order_id = response_data.get('id')
        
        return success

    def test_get_orders(self):
        """Test getting all orders (admin functionality)"""
        return self.run_test("Get All Orders", "GET", "orders", 200)

    def test_get_single_order(self):
        """Test getting a single order by ID"""
        if hasattr(self, 'test_order_id') and self.test_order_id:
            return self.run_test("Get Single Order", "GET", f"orders/{self.test_order_id}", 200)
        else:
            print("❌ No order ID available for single order test")
            return False

    def test_get_nonexistent_order(self):
        """Test getting a non-existent order"""
        return self.run_test("Get Non-existent Order", "GET", "orders/nonexistent-id", 404)

    def test_invalid_order_creation(self):
        """Test creating an order with invalid data"""
        invalid_order = {
            "customer_email": "",  # Invalid email
            "items": []  # Empty items
        }
        
        # This should fail validation
        success, _ = self.run_test("Create Invalid Order", "POST", "orders", 422, invalid_order)
        # For this test, we expect it to fail, so success means the API correctly rejected it
        return not success  # Invert because we expect this to fail

def main():
    print("🚀 Starting Digital Products Marketplace API Tests")
    print("=" * 60)
    
    tester = DigitalProductsAPITester()
    
    # Run all tests
    test_methods = [
        tester.test_api_root,
        tester.test_get_products,
        tester.test_get_single_product,
        tester.test_get_nonexistent_product,
        tester.test_create_order,
        tester.test_get_orders,
        tester.test_get_single_order,
        tester.test_get_nonexistent_order,
        tester.test_invalid_order_creation
    ]
    
    for test_method in test_methods:
        try:
            test_method()
        except Exception as e:
            print(f"❌ Test {test_method.__name__} failed with exception: {str(e)}")
    
    # Print final results
    print("\n" + "=" * 60)
    print(f"📊 API Test Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All API tests passed!")
        return 0
    else:
        print(f"⚠️  {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())