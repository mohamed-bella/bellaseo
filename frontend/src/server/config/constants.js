// Workflow state machine
const WORKFLOW_STATUS = {
  PENDING: 'pending',
  GENERATING: 'generating',
  REVIEWING: 'reviewing',
  APPROVED: 'approved',
  PUBLISHING: 'publishing',
  PUBLISHED: 'published',
  FAILED: 'failed',
};

// Article statuses
const ARTICLE_STATUS = {
  DRAFT: 'draft',
  REVIEW: 'review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  PUBLISHED: 'published',
};

// Campaign statuses
const CAMPAIGN_STATUS = {
  ACTIVE: 'active',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  ARCHIVED: 'archived',
};

// Keyword statuses
const KEYWORD_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  DONE: 'done',
  FAILED: 'failed',
};

// Site types
const SITE_TYPE = {
  WORDPRESS: 'wordpress',
  BLOGGER: 'blogger',
};

// Log levels
const LOG_LEVEL = {
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  DEBUG: 'debug',
};

// Schedule types
const SCHEDULE_TYPE = {
  MANUAL: 'manual',
  HOURLY: 'hourly',
  DAILY: 'daily',
  WEEKLY: 'weekly',
};

module.exports = {
  WORKFLOW_STATUS,
  ARTICLE_STATUS,
  CAMPAIGN_STATUS,
  KEYWORD_STATUS,
  SITE_TYPE,
  LOG_LEVEL,
  SCHEDULE_TYPE,
};
