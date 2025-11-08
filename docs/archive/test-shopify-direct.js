// Direct test of Shopify GraphQL API
// Note: This requires STOREFRONT_ACCESS_TOKEN environment variable

const productId = "8252597338298";
const shopDomain = "vt-test-5.myshopify.com";
const gidProductId = `gid://shopify/Product/${productId}`;

const query = `
  query getProduct($id: ID!) {
    product(id: $id) {
      id
      title
      description
      productType
      tags
      images(first: 10) {
        edges {
          node {
            url
            altText
          }
        }
      }
      variants(first: 1) {
        edges {
          node {
            id
            title
            price {
              amount
              currencyCode
            }
            selectedOptions {
              name
              value
            }
          }
        }
      }
    }
  }
`;

const variables = { id: gidProductId };

console.log("=== Shopify Product Fetch Test ===");
console.log("Store Domain:", shopDomain);
console.log("Product ID:", productId);
console.log("GID Product ID:", gidProductId);
console.log("");
console.log("GraphQL Query:");
console.log(query);
console.log("");
console.log("Variables:");
console.log(JSON.stringify(variables, null, 2));
console.log("");
console.log("API Endpoint: https://" + shopDomain + "/api/2024-01/graphql.json");
console.log("");
console.log("To test, you need:");
console.log("1. Storefront API Access Token");
console.log("2. Run: curl -X POST https://vt-test-5.myshopify.com/api/2024-01/graphql.json \\");
console.log("     -H 'Content-Type: application/json' \\");
console.log("     -H 'X-Shopify-Storefront-Access-Token: YOUR_TOKEN' \\");
console.log("     -d '" + JSON.stringify({ query, variables }) + "'");
