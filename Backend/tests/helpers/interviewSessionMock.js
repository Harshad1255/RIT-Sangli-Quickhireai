// Models database claims for controller tests, including lease ownership.
module.exports = () => {
  const sessions = new Map();
  return class Session {
    constructor(data) { Object.assign(this, data); }
    async save() { sessions.set(this.interviewCode, this); }
    static async findOne({interviewCode}) { return sessions.get(interviewCode) || null; }
    static async findOneAndUpdate(filter, update) {
      const session = sessions.get(filter.interviewCode);
      if (!session || session.processingUntil > new Date()) return null;
      Object.assign(session, update.$set);
      return session;
    }
    static async updateOne(filter, update) {
      const session = sessions.get(filter.interviewCode);
      if (!session || (filter.processingToken && session.processingToken !== filter.processingToken)) return;
      if (update.$set) Object.assign(session, update.$set);
      for (const key of Object.keys(update.$unset || {})) delete session[key];
    }
    static async deleteOne({interviewCode}) { sessions.delete(interviewCode); }
  };
};
