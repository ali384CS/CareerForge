export interface SkillSet {
  tech: string[];
  soft: string[];
}

export interface DomainConfig {
  intern: SkillSet;
  job: SkillSet;
}

export const DOMAIN_SKILLS: Record<string, DomainConfig> = {
  web: {
    intern: {
      tech: [
        "html", "css", "javascript", "react", "git", "github", "bootstrap", "tailwind",
        "sass", "responsive design", "web development", "vscode", "flexbox", "css grid"
      ],
      soft: ["communication", "teamwork", "adaptability", "time management", "problem solving", "learning agility"]
    },
    job: {
      tech: [
        "javascript", "typescript", "react", "next.js", "angular", "vue", "node.js",
        "express", "rest api", "graphql", "webpack", "vite", "docker", "gcp", "aws",
        "git", "github", "ci/cd", "agile", "scrum", "sql", "postgresql", "mongodb",
        "tailwind", "oauth", "jwt", "microservices", "unit testing", "jest"
      ],
      soft: [
        "leadership", "collaboration", "communication", "problem solving", "critical thinking",
        "stakeholder management", "project management", "mentorship"
      ]
    }
  },
  ml: {
    intern: {
      tech: [
        "python", "numpy", "pandas", "scikit-learn", "matplotlib", "seaborn", "git",
        "github", "sql", "data preprocessing", "linear algebra", "statistics", "jupyter notebook"
      ],
      soft: ["curiosity", "problem solving", "critical thinking", "communication", "teamwork"]
    },
    job: {
      tech: [
        "python", "tensorflow", "pytorch", "keras", "scikit-learn", "pandas", "numpy",
        "mlops", "docker", "kubernetes", "aws", "gcp", "sql", "nosql", "hadoop", "spark",
        "nlp", "natural language processing", "computer vision", "hugging face", "deep learning",
        "neural networks", "model deployment", "ci/cd", "git"
      ],
      soft: [
        "critical thinking", "problem solving", "communication", "collaboration",
        "research mindset", "leadership", "project management"
      ]
    }
  },
  data_engineering: {
    intern: {
      tech: [
        "python", "sql", "postgresql", "mysql", "excel", "pandas", "etl", "git",
        "github", "data modeling", "database design", "relational databases"
      ],
      soft: ["attention to detail", "problem solving", "analytical thinking", "communication", "teamwork"]
    },
    job: {
      tech: [
        "python", "scala", "java", "sql", "postgresql", "mysql", "nosql", "mongodb", "redis",
        "apache spark", "hadoop", "kafka", "airflow", "snowflake", "redshift", "etl", "elt",
        "data warehousing", "data pipelines", "aws", "gcp", "docker", "kubernetes", "terraform", "git"
      ],
      soft: [
        "problem solving", "analytical thinking", "communication", "collaboration",
        "project management", "attention to detail"
      ]
    }
  },
  devops: {
    intern: {
      tech: [
        "linux", "git", "github", "bash", "python", "docker", "networking basics",
        "aws basics", "cloud computing", "ssh", "command line"
      ],
      soft: ["adaptability", "problem solving", "teamwork", "communication", "continuous learning"]
    },
    job: {
      tech: [
        "linux", "bash", "python", "powershell", "git", "github", "docker", "kubernetes",
        "terraform", "ansible", "jenkins", "circleci", "gitlab ci", "aws", "gcp", "azure",
        "prometheus", "grafana", "elk stack", "networking", "cybersecurity", "ci/cd", "helm"
      ],
      soft: [
        "problem solving", "crisis management", "communication", "collaboration",
        "time management", "leadership"
      ]
    }
  },
  cybersecurity: {
    intern: {
      tech: [
        "networking", "tcp/ip", "linux", "windows security", "cryptography basics",
        "wireshark", "owasp top 10", "python", "bash", "git", "information security"
      ],
      soft: ["integrity", "analytical thinking", "attention to detail", "communication", "problem solving"]
    },
    job: {
      tech: [
        "firewalls", "siem", "ids/ips", "penetration testing", "vulnerability assessment",
        "incident response", "cryptography", "wireshark", "metasploit", "linux", "python",
        "aws security", "azure security", "network security", "compliance", "soc",
        "threat hunting", "ethical hacking"
      ],
      soft: [
        "analytical thinking", "decision making", "communication", "collaboration",
        "stress management", "attention to detail", "problem solving"
      ]
    }
  },
  ui_ux: {
    intern: {
      tech: [
        "figma", "wireframing", "prototyping", "user research", "color theory",
        "typography", "sketching", "design principles", "adobe photoshop", "adobe illustrator"
      ],
      soft: ["empathy", "communication", "teamwork", "receptiveness to feedback", "creativity"]
    },
    job: {
      tech: [
        "figma", "sketch", "adobe xd", "wireframing", "high-fidelity prototyping",
        "user research", "usability testing", "design systems", "information architecture",
        "user journeys", "html", "css", "interaction design", "product design"
      ],
      soft: [
        "empathy", "communication", "collaboration", "stakeholder management",
        "problem solving", "creativity", "presentation skills"
      ]
    }
  },
  pm: {
    intern: {
      tech: [
        "product roadmap", "agile", "scrum", "jira", "excel", "market research",
        "user feedback", "data analysis basics", "wireframing"
      ],
      soft: ["communication", "empathy", "leadership", "collaboration", "organization", "active listening"]
    },
    job: {
      tech: [
        "product roadmap", "agile", "scrum", "jira", "confluence", "product lifecycle",
        "market research", "competitor analysis", "sql", "a/b testing", "google analytics",
        "kpi tracking", "user analytics", "financial modeling", "product strategy"
      ],
      soft: [
        "leadership", "stakeholder management", "communication", "negotiation",
        "decision making", "strategic thinking", "conflict resolution"
      ]
    }
  },
  general: {
    intern: {
      tech: [
        "excel", "word", "powerpoint", "git", "github", "javascript", "python", "html", "css",
        "data entry", "spreadsheets", "google docs", "coding basics"
      ],
      soft: [
        "communication", "teamwork", "problem solving", "time management",
        "adaptability", "organization", "learning agility"
      ]
    },
    job: {
      tech: [
        "javascript", "typescript", "python", "java", "sql", "git", "github", "docker", "aws",
        "excel", "data analysis", "agile", "scrum", "project management", "rest api"
      ],
      soft: [
        "leadership", "communication", "teamwork", "problem solving", "time management",
        "critical thinking", "adaptability", "collaboration", "project management", "organization"
      ]
    }
  }
};

export function getDomainSkills(domain?: string, roleType?: string): SkillSet {
  const selectedDomain = domain && DOMAIN_SKILLS[domain] ? domain : "general";
  const selectedType = roleType === "intern" ? "intern" : "job";
  return DOMAIN_SKILLS[selectedDomain][selectedType];
}
