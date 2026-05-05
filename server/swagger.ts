/**
 * OpenAPI/Swagger Configuration
 *
 * Provides API documentation using Swagger UI
 */

import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { Express } from "express";

const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "Synerxus API",
    version: "1.0.0",
    description: `
      Synerxus Platform API - Volunteer Management and CSR Impact Tracking

      ## Authentication

      Most endpoints require authentication.
      - **Bearer Token**: Include \`Authorization: Bearer <token>\` header

      ## Rate Limiting

      - General endpoints: 100 requests per 15 minutes
      - Auth endpoints: 10 requests per 15 minutes
      - Export endpoints: 10 requests per hour
    `,
    contact: {
      name: "Synerxus Support",
      email: "hello@synerxus.com",
    },
    license: {
      name: "Proprietary",
    },
  },
  servers: [
    {
      url: "/api",
      description: "API Server",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          error: {
            type: "string",
            description: "Error code",
          },
          message: {
            type: "string",
            description: "Human-readable error message",
          },
          details: {
            type: "object",
            description: "Additional error details",
          },
          timestamp: {
            type: "string",
            format: "date-time",
          },
        },
      },
      User: {
        type: "object",
        properties: {
          id: { type: "integer" },
          email: { type: "string", format: "email" },
          username: { type: "string" },
          displayName: { type: "string" },
          userType: {
            type: "string",
            enum: ["volunteer", "organization", "corporate-partner"],
          },
          avatar: { type: "string", format: "uri" },
          organizationId: { type: "integer", nullable: true },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Project: {
        type: "object",
        properties: {
          id: { type: "integer" },
          name: { type: "string" },
          description: { type: "string" },
          organizationId: { type: "integer" },
          status: {
            type: "string",
            enum: ["draft", "active", "completed", "archived"],
          },
          startDate: { type: "string", format: "date-time" },
          endDate: { type: "string", format: "date-time" },
          location: { type: "string" },
          sdgGoals: {
            type: "array",
            items: { type: "integer", minimum: 1, maximum: 17 },
          },
          completionPercentage: { type: "integer", minimum: 0, maximum: 100 },
          totalHoursLogged: { type: "integer" },
          livesTouched: { type: "integer" },
        },
      },
      VolunteerActivity: {
        type: "object",
        properties: {
          id: { type: "integer" },
          userId: { type: "integer" },
          projectId: { type: "integer" },
          hours: { type: "number" },
          date: { type: "string", format: "date-time" },
          description: { type: "string" },
          verificationStatus: {
            type: "string",
            enum: ["pending", "approved", "rejected"],
          },
          skillsApplied: {
            type: "array",
            items: { type: "string" },
          },
        },
      },
      ProjectImpact: {
        type: "object",
        properties: {
          id: { type: "integer" },
          projectId: { type: "integer" },
          metricId: { type: "integer" },
          value: { type: "number" },
          verificationStatus: {
            type: "string",
            enum: ["pending", "approved", "rejected", "self_reported"],
          },
          reportedBy: { type: "integer" },
          reportedAt: { type: "string", format: "date-time" },
        },
      },
      PendingApprovals: {
        type: "object",
        properties: {
          pendingActivities: {
            type: "array",
            items: { $ref: "#/components/schemas/VolunteerActivity" },
          },
          pendingImpacts: {
            type: "array",
            items: { $ref: "#/components/schemas/ProjectImpact" },
          },
          totalPending: { type: "integer" },
        },
      },
      Organization: {
        type: "object",
        properties: {
          id: { type: "integer" },
          name: { type: "string" },
          description: { type: "string" },
          logo: { type: "string", format: "uri" },
          website: { type: "string", format: "uri" },
          contactEmail: { type: "string", format: "email" },
          primarySdgs: {
            type: "array",
            items: { type: "integer" },
          },
        },
      },
      CSRPartner: {
        type: "object",
        properties: {
          id: { type: "integer" },
          userId: { type: "integer" },
          companyName: { type: "string" },
          contactEmail: { type: "string", format: "email" },
          industryType: { type: "string" },
          employeeCount: { type: "integer" },
          annualCSRBudget: { type: "number" },
          primarySdgs: {
            type: "array",
            items: { type: "integer" },
          },
        },
      },
    },
    responses: {
      Unauthorized: {
        description: "Authentication required",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
          },
        },
      },
      Forbidden: {
        description: "Insufficient permissions",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
          },
        },
      },
      NotFound: {
        description: "Resource not found",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
          },
        },
      },
      RateLimited: {
        description: "Too many requests",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
          },
        },
      },
    },
  },
  tags: [
    { name: "Auth", description: "Authentication endpoints" },
    { name: "Users", description: "User management" },
    { name: "Projects", description: "Project management" },
    { name: "Activities", description: "Volunteer activities and hours" },
    { name: "Impacts", description: "Project impact tracking" },
    { name: "Organizations", description: "Organization management" },
    { name: "CSR", description: "Corporate partner endpoints" },
    { name: "Approvals", description: "Verification and approval workflows" },
  ],
};

const options = {
  swaggerDefinition,
  apis: ["./server/routes/*.ts", "./server/routes/**/*.ts"],
};

const swaggerSpec = swaggerJsdoc(options);

/**
 * Setup Swagger UI
 */
export function setupSwagger(app: Express): void {
  if (process.env.NODE_ENV === "production") {
    console.log("[Swagger] Disabled in production");
    return;
  }

  // Swagger JSON endpoint
  app.get("/api/docs/swagger.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
  });

  // Swagger UI
  app.use(
    "/api/docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      explorer: true,
      customCss: ".swagger-ui .topbar { display: none }",
      customSiteTitle: "Synerxus API Documentation",
    })
  );

  console.log("[Swagger] API documentation available at /api/docs");
}

export { swaggerSpec };
