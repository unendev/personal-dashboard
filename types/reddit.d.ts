export interface RedditPost {
  id: string;
  title: string;
  url: string;
  analysis: {
    core_issue: string;
    key_info: string[];
    post_type: string;
    value_assessment: string;
  };
}

export interface RedditReport {
  meta: {
    report_date: string;
    title: string;
    source: string;
    post_count: number;
  };
  summary: {
    overview: string;
    highlights: {
      tech_savvy: string[];
      resources_deals: string[];
      hot_topics: string[];
    };
    conclusion: string;
  };
  posts: RedditPost[];
}
