#!/bin/bash

# Run dashboard on port 3001
# This allows you to run the main app on port 3000 and dashboard on 3001

echo "Starting dashboard on port 3001..."
echo "Access at: http://localhost:3001/dashboard?shop=your-store.myshopify.com"
echo ""
echo "Make sure the main app is running on port 3000 for API calls"
echo ""

PORT=3001 next dev

