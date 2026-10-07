import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
export const siteContent = sqliteTable("site_content", {
  id: integer("id").primaryKey(),
  content: text("content").notNull(),
  updatedAt: text("updated_at").notNull(),
});
export const partners = sqliteTable("partners", {
  id: text("id").primaryKey(),
  nome: text("nome").notNull(),
  descricao: text("descricao").notNull(),
  logo: text("logo").notNull(),
  instagram: text("instagram").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
