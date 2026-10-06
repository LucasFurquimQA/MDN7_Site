declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    BUCKET?: R2Bucket;
    ADMIN_EMAIL?: string;
    CF_ACCESS_TEAM_DOMAIN?: string;
    CF_ACCESS_AUD?: string;
    INSTAGRAM_ACCESS_TOKEN?: string;
    INSTAGRAM_BUSINESS_ACCOUNT_ID?: string;
    INSTAGRAM_API_VERSION?: string;
  }
}
