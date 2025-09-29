# Replace YOUR_JWT_TOKEN with your actual JWT token from login
export JWT_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjcsInVzZXJuYW1lIjoidGVzdHVzZXIiLCJpYXQiOjE3NTg2NDg0NzQsImV4cCI6MTc1ODczNDg3NH0.HWkIkhJcRykKi0F6rUg93BdBH8WXkBOXrzTi8ugQ_wM"

# 1. Test integration status
echo "Testing integration status..."
curl -X GET \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  http://localhost:5000/api/integrations/github/status

echo -e "\n\n"

# 2. Test repositories endpoint
echo "Testing repositories..."
curl -X GET \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  http://localhost:5000/api/integrations/github/repositories

echo -e "\n\n"

# 3. Check if you have any GitHub integrations in database
echo "Direct database check - run this SQL in your database:"
echo "SELECT * FROM github_integrations WHERE user_id = 7;"
echo "SELECT * FROM github_repositories;"