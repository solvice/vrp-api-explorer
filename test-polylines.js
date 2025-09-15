#!/usr/bin/env node

const fetch = require('node-fetch');

// Test the polylines sample data with actual API call
async function testPolylines() {
  const polylinesSampleData = {
    jobs: [
      { name: "Brussels", duration: 900, location: { latitude: 50.8465, longitude: 4.3517 } },
      { name: "Antwerp", duration: 900, location: { latitude: 51.2213, longitude: 4.4051 } },
      { name: "Ghent", duration: 900, location: { latitude: 51.0538, longitude: 3.7250 } },
      { name: "Bruges", duration: 900, location: { latitude: 51.2092, longitude: 3.2244 } },
      { name: "Leuven", duration: 900, location: { latitude: 50.8798, longitude: 4.7005 } }
    ],
    resources: [
      {
        name: "delivery_truck",
        shifts: [
          {
            from: "2024-01-15T08:00:00Z",
            to: "2024-01-15T18:00:00Z",
            start: { latitude: 50.8465, longitude: 4.3517 }, // Start in Brussels
            end: { latitude: 50.8465, longitude: 4.3517 }     // Return to Brussels
          }
        ]
      }
    ],
    options: {
      polylines: true  // Enable polyline geometry in response
    }
  };

  try {
    console.log('🚀 Testing VRP API with polylines enabled...');
    console.log('Request options:', polylinesSampleData.options);

    const response = await fetch('http://localhost:3000/api/vrp/solve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(polylinesSampleData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API call failed:', response.status, errorText);
      return;
    }

    const result = await response.json();

    console.log('✅ API call successful!');
    console.log('Response structure:');
    console.log('- trips count:', result.trips?.length || 0);

    if (result.trips?.[0]) {
      const firstTrip = result.trips[0];
      console.log('First trip:');
      console.log('- resource:', firstTrip.resource);
      console.log('- visits count:', firstTrip.visits?.length || 0);
      console.log('- has polyline:', !!firstTrip.polyline);
      console.log('- polyline type:', typeof firstTrip.polyline);
      console.log('- polyline length:', firstTrip.polyline?.length || 0);
      console.log('- polyline preview:', firstTrip.polyline?.substring(0, 50) + '...');

      console.log('\nFull trip object keys:', Object.keys(firstTrip));

      if (firstTrip.polyline) {
        console.log('\n🎉 POLYLINES ARE INCLUDED IN THE RESPONSE!');
      } else {
        console.log('\n❌ No polylines found in response');
      }
    }

  } catch (error) {
    console.error('❌ Error testing polylines:', error.message);
  }
}

testPolylines();