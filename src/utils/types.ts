export interface Session {
  id: string;
  name: string;
  startTime: Date;
  endTime?: Date;
  notes?: string;
}

export interface ProjectContext {
  openFiles: string[];
  gitBranch: string;
  recentCommits: string[];
  projectStructure: string;
  session: Session;
}
