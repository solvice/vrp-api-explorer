VRP API Explorer

This is a simple API explorer for the Solvice VRP API.
The solvice VRP solver solve requests

Solvice documentation: https://docs2.solvice.io/

The API explorer allows you to explore the Solvice VRP API endpoints and test them interactively.
It provides a user-friendly interface for developers to interact with the API and understand its functionality.
We want to test a single endpoint:
`POST https://api.solvice.io/v2/vrp/solve/sync`
this endpoint solves the problem and returns result synchronously

Check out the SDK for that: https://www.npmjs.com/package/solvice-vrp-solver

Dont make different types than the types that are defined in the SDK.


UI:
- Use Shadcn as a UI components.
- split pane. left for request / response, right for the map
- left pane:
  - endpoint | send
  - body | api key
  - editor json (request) https://uiwjs.github.io/react-json-view/
  - response json (non editable)
- right pane
  - map with the OnRouteResponse.trips.visits displayed
- mimic @graphhopper.jpg
- use shadcn resizable


Make the UI as simple as possible. The components like in graphhopper but then more minimal and professional. Just like the v0.dev design from vercel.
