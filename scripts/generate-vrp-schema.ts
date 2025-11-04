#!/usr/bin/env tsx
/**
 * Generate JSON Schema from Solvice VRP TypeScript types
 *
 * This script uses typescript-json-schema to generate a JSON Schema
 * from the VrpSyncSolveParams type in the Solvice SDK.
 *
 * The generated schema enables Monaco Editor autocomplete and validation.
 */

import * as TJS from "typescript-json-schema";
import * as fs from "fs";
import * as path from "path";

// Configuration for typescript-json-schema
const settings: TJS.PartialArgs = {
  required: true,
  noExtraProps: false,
  strictNullChecks: true,
  ignoreErrors: false,
  validationKeywords: ["description", "default", "example"],
  titles: true,
  ref: true,
};

const compilerOptions: TJS.CompilerOptions = {
  strictNullChecks: true,
  esModuleInterop: true,
  skipLibCheck: true,
  moduleResolution: "node" as any,
};

/**
 * Enhance schema with type information in titles for better Monaco autocomplete
 */
function enhanceSchemaWithTypeInfo(schema: any): void {
  // Helper to get readable type from schema property
  function getTypeLabel(prop: any): string {
    if (!prop) return "";

    // Handle anyOf/oneOf with null (optional types)
    if (prop.anyOf) {
      const nonNullTypes = prop.anyOf.filter((t: any) => t.type !== "null");
      const hasNull = prop.anyOf.some((t: any) => t.type === "null");

      if (nonNullTypes.length === 1) {
        const baseType = getTypeLabel(nonNullTypes[0]);
        return hasNull ? `${baseType}?` : baseType;
      }

      // Multiple non-null types - show them all
      if (nonNullTypes.length > 1) {
        const types = nonNullTypes
          .map((t: any) => getTypeLabel(t))
          .filter(Boolean)
          .join(" | ");
        return hasNull ? `(${types})?` : types;
      }
    }

    // Handle array of types
    if (Array.isArray(prop.type)) {
      const types = prop.type.filter((t: string) => t !== "null");
      const hasNull = prop.type.includes("null");
      if (types.length === 1) {
        return hasNull ? `${types[0]}?` : types[0];
      }
      const typeStr = types.join(" | ");
      return hasNull ? `(${typeStr})?` : typeStr;
    }

    // Handle direct types
    if (prop.type) {
      if (prop.type === "array") {
        return "array";
      }
      if (prop.type === "object") {
        return "object";
      }
      return prop.type;
    }

    // Handle $ref
    if (prop.$ref) {
      return "object";
    }

    return "";
  }

  // Recursively enhance all properties
  function enhanceProperties(obj: any): void {
    if (!obj || typeof obj !== "object") return;

    // Enhance properties
    if (obj.properties) {
      Object.keys(obj.properties).forEach((key) => {
        const prop = obj.properties[key];
        const typeLabel = getTypeLabel(prop);

        // Update title to include type information
        if (typeLabel) {
          const originalTitle = prop.title || key;
          prop.title = `${originalTitle}: ${typeLabel}`;
        }

        // Recursively enhance nested properties
        enhanceProperties(prop);
      });
    }

    // Enhance definitions
    if (obj.definitions) {
      Object.keys(obj.definitions).forEach((key) => {
        enhanceProperties(obj.definitions[key]);
      });
    }

    // Handle arrays
    if (obj.items) {
      enhanceProperties(obj.items);
    }

    // Handle anyOf/oneOf
    if (obj.anyOf) {
      obj.anyOf.forEach((item: any) => enhanceProperties(item));
    }
    if (obj.oneOf) {
      obj.oneOf.forEach((item: any) => enhanceProperties(item));
    }
  }

  enhanceProperties(schema);
}

async function generateSchema() {
  console.log("🔧 Generating VRP JSON Schema...");

  // Path to the Solvice SDK types
  const sdkTypePath = path.resolve(
    __dirname,
    "../node_modules/solvice-vrp-solver/resources/vrp/vrp.d.ts",
  );

  // Check if the SDK types file exists
  if (!fs.existsSync(sdkTypePath)) {
    console.error("❌ Error: Solvice SDK types not found at:", sdkTypePath);
    console.error("   Make sure solvice-vrp-solver is installed");
    process.exit(1);
  }

  console.log("📁 Reading types from:", sdkTypePath);

  // Create the program from the SDK types
  const program = TJS.getProgramFromFiles([sdkTypePath], compilerOptions);

  // Generate schema for VrpSyncSolveParams
  const schema = TJS.generateSchema(program, "VrpSyncSolveParams", settings);

  if (!schema) {
    console.error("❌ Error: Failed to generate schema");
    process.exit(1);
  }

  // Add metadata to the schema
  schema.$schema = "http://json-schema.org/draft-07/schema#";
  schema.title = "VRP Solve Request";
  schema.description =
    "Vehicle Routing Problem solve request parameters for the Solvice VRP API";

  // Enhance schema with type information in titles for better autocomplete
  enhanceSchemaWithTypeInfo(schema);

  // Ensure the public/schemas directory exists
  const outputDir = path.resolve(__dirname, "../public/schemas");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log("📁 Created directory:", outputDir);
  }

  // Write the schema to file
  const outputPath = path.join(outputDir, "vrp-request.schema.json");
  fs.writeFileSync(outputPath, JSON.stringify(schema, null, 2), "utf-8");

  console.log("✅ Schema generated successfully!");
  console.log("📄 Output:", outputPath);
  console.log(
    `📊 Schema contains ${Object.keys(schema.properties || {}).length} top-level properties`,
  );
}

// Run the generator
generateSchema().catch((error) => {
  console.error("❌ Error generating schema:", error);
  process.exit(1);
});
