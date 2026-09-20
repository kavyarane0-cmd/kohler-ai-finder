# kohler-ai-finder
AI-powered bathroom &amp; kitchen product recommendation platform that analyzes fixtures and recommends KOHLER products based on space, budget, dimensions, style, and finish.

# KOHLER Fit Finder 🚿

### AI-Powered Bathroomware & Kitchenware Recommendation System

KOHLER Fit Finder is an AI-assisted web application that helps users find suitable KOHLER bathroom and kitchen products based on their existing fixture, detected issue, available space, dimensions, budget, preferred style, and finish.

Instead of manually browsing through a large product catalog, users can upload an image of their existing fixture, confirm the detected issue, enter their space requirements, and receive personalized product recommendations based on the KOHLER India Price Book 2026.

---

## 🚀 What Does KOHLER Fit Finder Do?

The application combines **AI-powered image understanding**, **structured product data**, **space-aware recommendation logic**, and **2D visualization** into one guided product-selection experience.

### The workflow

```text
Upload / Scan Fixture Image
            ↓
      Gemini Vision AI
            ↓
 Fixture + Issue Detection
            ↓
      User Confirmation
            ↓
   Space & Requirement Input
            ↓
    KOHLER Product Catalog
            ↓
  Recommendation & Scoring
            ↓
 Product Recommendations
            ↓
 Complete Configurations
            ↓
      2D Visualization
```
# Key Features

## 1. AI-Powered Fixture Scanning

Users can upload an image of a bathroom or kitchen fixture.

The AI analyzes the image and identifies the most likely fixture category, such as:

- Bathroom Faucet
- Washbasin
- Toilet
- Shower
- Bathtub
- Kitchen Faucet
- Kitchen Sink

The system also attempts to identify visible issues such as:

- Leakage
- Visible Damage
- Crack
- Corrosion
- Broken Component
- Replacement Required
- No Visible Issue

The image analysis is powered by **Google Gemini**.

---

## 2. AI-Based Issue Detection

The image analysis does not simply classify the object.

It also determines the likely visible issue associated with the fixture.

## ✅ 3. Human-in-the-Loop Confirmation

AI predictions are not automatically treated as final.

Users can review and confirm the detected fixture and issue.

This ensures that the recommendation engine works with the user's confirmed requirements.

## 📐 4. Space & Dimension Input

Users can provide information about their available space.

Supported inputs include:

Bathroom / Kitchen
Length
Width
Height
Countertop depth for kitchens
Unit of measurement
Budget
Style
Finish

Supported units:

Feet
Inches
Centimeters
## 💰 5. Budget-Based Recommendations

Users can specify their preferred budget range.

The recommendation engine evaluates products from the KOHLER catalog based on their listed prices.

This allows the system to prioritize products that are relevant to the user's financial requirements.

## 🎨 6. Style & Finish Preferences

Users can select their preferred design style.

Styles
Modern
Minimal
Contemporary
Classic
Luxury
No Preference
Finishes
Polished Chrome
Matte Black
Brushed Nickel
Brushed Bronze
French Gold
Rose Gold
No Preference

These preferences contribute to the recommendation scoring process.

## 🧠 7. Smart Product Recommendation

The recommendation engine evaluates products using multiple factors:

Detected fixture category
Confirmed issue
Product category
Budget compatibility
Available space
Product dimensions
Finish preference
Available product information

Products that clearly exceed the available space can be filtered out.

The remaining products are scored and the highest-scoring relevant products are displayed.

## 📚 8. KOHLER Price Book Integration

The recommendation system is grounded in the KOHLER India Price Book 2026 – June Edition.

The catalog contains information including:

Product SKU
Product name
Product description
Category
Subcategory
Collection
Price
Dimensions
Installation type
Finish
Material
Source page

The system uses this structured catalog rather than asking the AI to generate product names, SKUs, or prices.

## 🛁 9. Complete Product Configurations

Instead of recommending a single product, the system can generate complete configurations.

Example Bathroom Configuration
Toilet
   +
Washbasin
   +
Bathroom Faucet
   +
Shower
Example Kitchen Configuration
Kitchen Sink
   +
Kitchen Faucet

Configurations include:

Total price
Remaining budget
Match score
Selected products
Recommendation reasons
Dimensional information
## 📊 10. Explainable Recommendations

The application provides reasons behind recommendations instead of only displaying a product list.

Example:

✓ Fits within the selected budget

✓ Matches the selected finish

✓ Published dimensions are available

✓ Includes the detected fixture category

• Professional dimensional verification recommended

This makes the recommendation process easier to understand.

## 🗺️ 11. 2D Space Visualization

The application generates a simplified 2D layout of the recommended configuration.

The visualization includes:

Room boundaries
Product placement
Fixture categories
Entry area
Kitchen counter zone
Room dimensions
Product footprints

Product boxes are scaled using available product dimension information.

The visualization is intended as a planning aid and is not a professional architectural or installation drawing.

## 🛍️ 12. Product Catalog

The application also provides product browsing functionality.

Products can be searched and filtered using catalog information such as:

Category
Subcategory
Price
Finish
Search terms
