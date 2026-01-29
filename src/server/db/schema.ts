// Example model schema from the Drizzle docs
// https://orm.drizzle.team/docs/sql-schema-declaration

export * from "@/server/db/schema/base";
export * from "@/server/db/schema/cms";
export * from "@/server/db/schema/orders";
export * from "@/server/db/schema/printful";
export * from "@/server/db/schema/product";

// Multi-user platform schemas
export * from "@/server/db/schema/users";
export * from "@/server/db/schema/pod-providers";
export * from "@/server/db/schema/mockups";
