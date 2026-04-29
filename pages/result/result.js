const { ASSESSMENT_META, SCORE_KEYS, getMaxScoreForKey } = require('../../utils/assessment');

const NEED_LEVELS = [
  { key: 'low', label: '离开必要性低' },
  { key: 'middle', label: '离开必要性中' },
  { key: 'high', label: '离开必要性高' }
];

const READY_LEVELS = [
  { key: 'low', label: '离开准备度低' },
  { key: 'middle', label: '离开准备度中' },
  { key: 'high', label: '离开准备度高' }
];

const GROWTH_STORAGE_KEY = 'quitAssessmentGrowthState';
const BASE_DECISION_POINTS = 20;
const SHARE_POINTS = 10; // 分享获得10积分
const INVITE_OPEN_POINTS = 30; // 被邀请人点开链接获得30积分
const INVITE_COMPLETE_POINTS = 50; // 被邀请人完成测试获得50积分
const SHARE_UNLOCK_REQUIRED = 1;
const SHARE_UNLOCK_FALLBACK_WINDOW = 10 * 60 * 1000; // 10分钟窗口
const BASELINE_MAX_SCORE = getMaxScoreForKey('baseline');
const PRACTICAL_MAX_SCORE = getMaxScoreForKey('practical');

function createEmptyScores() {
  return SCORE_KEYS.reduce((accumulator, key) => {
    accumulator[key] = 0;
    return accumulator;
  }, {});
}

Page({
  data: {
    categoryScores: createEmptyScores(),
    leaveNeedScore: 0,
    readinessScore: 0,
    matrixActiveIndex: -1,
    matrixZoneText: '',
    adviceList: [],
    actionList: [],
    dimensionCards: [],
    resultTitle: '',
    resultSubtitle: '',
    needLevelLabel: '',
    readyLevelLabel: '',
    hasResult: true,
    showDetails: false,
    riskNotice: '',
    growthState: {
      decisionPoints: 0,
      shareUnlockRequired: SHARE_UNLOCK_REQUIRED,
      shareUnlockProgress: 0,
      enhancedUnlocked: false,
      baseRewardClaimed: false,
      baseRewardGrantedToday: false
    },
    enhancedReport: {
      summary: '',
      blockers: [],
      riskList: [],
      actionPlan: [],
      thirtyDayPlan: [],
      recommendation: ''
    },
    enhancedAuthority: {
      eyebrow: '',
      title: '',
      subtitle: '',
      institutionList: [],
      disciplineList: [],
      modelList: [],
      rigorList: [],
      statList: []
    },
    lockedEnhancedPreview: {
      title: '',
      subtitle: '',
      highlightList: [],
      sampleList: []
    },
    careerDirectionCard: {
      title: '',
      tag: '',
      summary: '',
      list: []
    },
    burnoutInsight: {
      title: '',
      tag: '',
      summary: '',
      symptom: '',
      cause: '',
      remedy: ''
    },
    nextFocusGuide: {
      title: '',
      tag: '',
      summary: '',
      list: []
    },
    unlockedModuleCount: 0,
    practicalCards: [],
    practicalAdviceList: [],
    baselineStatus: '',
    baselineAdviceList: [],
    decisionPoints: 0 // 决策值积分
  },

  onLoad: function (options) {
    try {
      this.processInviteOpen(options);

      const storedResult = wx.getStorageSync(ASSESSMENT_META.storageKey);

      if (!storedResult || !storedResult.categoryScores) {
        this.setData({
          hasResult: false,
          resultTitle: '还没有可查看的评估结果',
          resultSubtitle: '可能是从分享页进入，或本机结果已经失效。重新测试后就能看到完整分析。',
          actionList: ['重新完成一次测试，系统会按你的最新选择生成结果。']
        });
        return;
      }

      this.resultSessionId = String(storedResult.answeredAt || Date.now());
      this.resultPayload = storedResult;

      const categoryScores = {
        ...createEmptyScores(),
        ...(storedResult.categoryScores || {})
      };
      const leaveNeedScore = storedResult.leaveNeedScore || 0;
      const readinessScore = storedResult.readinessScore || 0;
      const needLevel = this.getNeedLevel(leaveNeedScore);
      const readyLevel = this.getReadyLevel(readinessScore);
      const growthState = this.ensureGrowthState(this.resultSessionId);

      this.setData({
        categoryScores,
        leaveNeedScore,
        readinessScore,
        matrixActiveIndex: this.getMatrixActiveIndex(needLevel, readyLevel),
        matrixZoneText: `${this.getNeedLevelText(needLevel)} × ${this.getReadyLevelText(readyLevel)}`,
        adviceList: this.getAdviceList(categoryScores, needLevel, readyLevel),
        actionList: this.getActionList(categoryScores, needLevel, readyLevel),
        dimensionCards: this.getDimensionCards(categoryScores),
        resultTitle: this.getResultTitle(needLevel, readyLevel),
        resultSubtitle: this.getResultSubtitle(needLevel, readyLevel),
        needLevelLabel: this.getNeedLevelText(needLevel),
        readyLevelLabel: this.getReadyLevelText(readyLevel),
        hasResult: true,
        riskNotice: categoryScores.strain >= 10
          ? '如果你已经持续失眠、明显躯体化，或频繁出现“真的撑不下去”的感觉，请把专业心理支持或医疗帮助也纳入这次决策。'
          : '',
        growthState,
        enhancedReport: this.getEnhancedReport(categoryScores, needLevel, readyLevel),
        enhancedAuthority: this.getEnhancedAuthorityMeta(categoryScores, needLevel, readyLevel),
        lockedEnhancedPreview: this.getLockedEnhancedPreview(categoryScores, needLevel, readyLevel),
        careerDirectionCard: this.getCareerDirectionCard(categoryScores, needLevel, readyLevel),
        burnoutInsight: this.getBurnoutInsight(categoryScores),
        nextFocusGuide: this.getNextFocusGuide(categoryScores, needLevel, readyLevel),
        unlockedModuleCount: growthState.enhancedUnlocked ? 4 : 0,
        practicalCards: this.getPracticalCards(categoryScores),
        practicalAdviceList: this.getPracticalAdviceList(categoryScores),
        baselineStatus: this.getBaselineStatus(categoryScores.baseline),
        baselineAdviceList: this.getBaselineAdviceList(categoryScores),
        decisionPoints: (wx.getStorageSync(GROWTH_STORAGE_KEY) || {}).decisionPoints || 0
      });

      this.safeSetShareMenu();

      // 处理邀请完成 - 如果被邀请人完成测试，给邀请人发放奖励
      this.processPendingInvites();
    } catch (error) {
      console.error('result page onLoad failed:', error);
      this.setData({
        hasResult: false,
        resultTitle: '结果页刚刚没加载出来',
        resultSubtitle: '这通常是页面初始化时某个步骤报错了。我已经加了兜底，你可以重新测试或返回首页再试一次。',
        actionList: ['重新测试一次，看看问题是否已经消失。']
      });
    }
  },

  onShow: function () {
    if (!this.resultSessionId) {
      return;
    }

    const growthState = this.getGrowthState(this.resultSessionId);
    if (!growthState.enhancedUnlocked && this.shouldFallbackUnlock()) {
      this.unlockEnhancedReport();
      wx.showToast({
        title: '增强版已解锁',
        icon: 'success'
      });
      return;
    }

    this.setData({
      growthState,
      unlockedModuleCount: growthState.enhancedUnlocked ? 4 : 0
    });
  },

  safeSetShareMenu: function () {
    try {
      if (typeof wx.showShareMenu !== 'function') {
        return;
      }

      const canUseTimelineMenu = typeof wx.canIUse === 'function'
        ? wx.canIUse('showShareMenu')
        : false;

      if (canUseTimelineMenu) {
        wx.showShareMenu({
          withShareTicket: true
        });
        return;
      }

      wx.showShareMenu();
    } catch (error) {
      console.error('showShareMenu failed:', error);
    }
  },

  goBack: function () {
    wx.navigateBack({
      fail: () => {
        wx.redirectTo({
          url: '../index/index'
        });
      }
    });
  },

  restartTest: function () {
    wx.redirectTo({
      url: '../index/index'
    });
  },

  toggleDetails: function () {
    this.setData({
      showDetails: !this.data.showDetails
    });
  },

  showUnlockGuide: function () {
    wx.showModal({
      title: '如何解锁增强版',
      content: '方式一：分享获得积分\n方式二：50积分直接兑换\n\n积分获取：\n• 完成测试：+20\n• 分享结果：+10\n• 接受邀请：+30\n• 好友完成测试：+50',
      showCancel: false,
      confirmText: '知道了'
    });
  },

  prepareShareUnlock: function () {
    if (this.data.growthState.enhancedUnlocked) {
      return;
    }

    this.shareUnlockIntentAt = Date.now();
  },

  shouldFallbackUnlock: function () {
    if (!this.shareUnlockIntentAt) {
      return false;
    }

    const withinWindow = Date.now() - this.shareUnlockIntentAt <= SHARE_UNLOCK_FALLBACK_WINDOW;
    this.shareUnlockIntentAt = 0;
    return withinWindow;
  },

  ensureGrowthState: function (sessionId) {
    const store = wx.getStorageSync(GROWTH_STORAGE_KEY) || {};
    const sessions = store.sessions || {};
    const currentSession = sessions[sessionId] || {
      shareUnlockProgress: 0,
      enhancedUnlocked: false,
      baseRewardClaimed: false
    };
    const todayKey = this.getTodayKey();
    const baseRewardGrantedToday = store.lastBaseRewardDate === todayKey;

    if (!currentSession.baseRewardClaimed && !baseRewardGrantedToday) {
      currentSession.baseRewardClaimed = true;
      store.decisionPoints = (store.decisionPoints || 0) + BASE_DECISION_POINTS;
      store.lastBaseRewardDate = todayKey;
    }

    sessions[sessionId] = currentSession;
    store.sessions = sessions;
    wx.setStorageSync(GROWTH_STORAGE_KEY, store);

    return this.normalizeGrowthState(store, currentSession, baseRewardGrantedToday || currentSession.baseRewardClaimed);
  },

  getGrowthState: function (sessionId) {
    const store = wx.getStorageSync(GROWTH_STORAGE_KEY) || {};
    const sessions = store.sessions || {};
    const currentSession = sessions[sessionId] || {
      shareUnlockProgress: 0,
      enhancedUnlocked: false,
      baseRewardClaimed: false
    };

    return this.normalizeGrowthState(
      store,
      currentSession,
      store.lastBaseRewardDate === this.getTodayKey() || currentSession.baseRewardClaimed
    );
  },

  normalizeGrowthState: function (store, session, baseRewardGrantedToday) {
    return {
      decisionPoints: store.decisionPoints || 0,
      shareUnlockRequired: SHARE_UNLOCK_REQUIRED,
      shareUnlockProgress: session.shareUnlockProgress || 0,
      enhancedUnlocked: !!session.enhancedUnlocked,
      baseRewardClaimed: !!session.baseRewardClaimed,
      baseRewardGrantedToday: !!baseRewardGrantedToday
    };
  },

  getTodayKey: function () {
    return new Date().toISOString().slice(0, 10);
  },

  processInviteOpen: function (options) {
    if (!options || !options.inviteSession || !options.inviteToken) {
      return;
    }

    const store = wx.getStorageSync(GROWTH_STORAGE_KEY) || {};
    const sessions = store.sessions || {};
    const inviteClaims = store.inviteClaims || {};
    const claimKey = `${options.inviteSession}:${options.inviteToken}`;
    const targetSession = sessions[options.inviteSession];

    if (!targetSession || inviteClaims[claimKey]) {
      return;
    }

    targetSession.shareUnlockProgress = Math.min(
      SHARE_UNLOCK_REQUIRED,
      (targetSession.shareUnlockProgress || 0) + 1
    );
    targetSession.enhancedUnlocked = targetSession.shareUnlockProgress >= SHARE_UNLOCK_REQUIRED;
    sessions[options.inviteSession] = targetSession;
    inviteClaims[claimKey] = true;
    store.sessions = sessions;
    store.inviteClaims = inviteClaims;
    wx.setStorageSync(GROWTH_STORAGE_KEY, store);
  },

  // 使用积分解锁增强版
  unlockByPoints: function () {
    const POINTS_COST = 50;
    const store = wx.getStorageSync(GROWTH_STORAGE_KEY) || {};
    const currentPoints = store.decisionPoints || 0;

    if (currentPoints < POINTS_COST) {
      wx.showToast({
        title: `需要 ${POINTS_COST} 决策值，当前只有 ${currentPoints}`,
        icon: 'none',
        duration: 2000
      });
      return;
    }

    // 扣除积分
    store.decisionPoints = currentPoints - POINTS_COST;
    wx.setStorageSync(GROWTH_STORAGE_KEY, store);

    // 解锁增强版
    this.unlockEnhancedReport();

    wx.showToast({
      title: '使用 50 决策值解锁成功',
      icon: 'success',
      duration: 2000
    });

    // 更新显示的积分
    this.setData({
      decisionPoints: store.decisionPoints
    });
  },

  unlockEnhancedReport: function () {
    if (!this.resultSessionId) {
      return;
    }

    const store = wx.getStorageSync(GROWTH_STORAGE_KEY) || {};
    const sessions = store.sessions || {};
    const currentSession = sessions[this.resultSessionId] || {
      shareUnlockProgress: 0,
      enhancedUnlocked: false,
      baseRewardClaimed: false
    };

    currentSession.shareUnlockProgress = SHARE_UNLOCK_REQUIRED;
    currentSession.enhancedUnlocked = true;
    sessions[this.resultSessionId] = currentSession;
    store.sessions = sessions;
    wx.setStorageSync(GROWTH_STORAGE_KEY, store);

    const growthState = this.normalizeGrowthState(
      store,
      currentSession,
      store.lastBaseRewardDate === this.getTodayKey() || currentSession.baseRewardClaimed
    );

    this.setData({
      growthState,
      unlockedModuleCount: 4
    });
  },

  // 处理待完成的邀请 - 当被邀请人完成测试后，给被邀请人发放额外奖励
  processPendingInvites: function () {
    const store = wx.getStorageSync(GROWTH_STORAGE_KEY) || {};
    const pendingInvites = store.pendingInvites || {};
    const sessions = store.sessions || {};
    const inviteClaims = store.inviteClaims || {};

    let hasNewReward = false;
    let totalPoints = 0;

    // 遍历所有待处理的邀请
    Object.keys(pendingInvites).forEach((claimKey) => {
      const invite = pendingInvites[claimKey];
      if (invite.completed) {
        return; // 已经处理过
      }

      const targetSession = sessions[invite.inviteSession];
      if (!targetSession) {
        return; // 邀请人session不存在
      }

      // 给邀请人增加解锁进度（帮助邀请人解锁增强版）
      const oldProgress = targetSession.shareUnlockProgress || 0;
      targetSession.shareUnlockProgress = Math.min(
        SHARE_UNLOCK_REQUIRED,
        oldProgress + 1
      );
      targetSession.enhancedUnlocked = targetSession.shareUnlockProgress >= SHARE_UNLOCK_REQUIRED;
      sessions[invite.inviteSession] = targetSession;

      // 给被邀请人（当前用户）发放完成测试的额外积分
      store.decisionPoints = (store.decisionPoints || 0) + INVITE_COMPLETE_POINTS;
      totalPoints += INVITE_COMPLETE_POINTS;

      // 标记为已领取
      inviteClaims[claimKey] = true;
      invite.completed = true;
      hasNewReward = true;

      console.log(`邀请完成奖励已发放: ${claimKey}, 获得${INVITE_COMPLETE_POINTS}积分`);
    });

    if (hasNewReward) {
      store.sessions = sessions;
      store.inviteClaims = inviteClaims;
      store.pendingInvites = pendingInvites;
      wx.setStorageSync(GROWTH_STORAGE_KEY, store);

      // 更新页面显示的积分
      this.setData({
        decisionPoints: store.decisionPoints
      });

      wx.showToast({
        title: `完成邀请测试！获得${totalPoints}决策值`,
        icon: 'success',
        duration: 2000
      });
    }

    return hasNewReward;
  },

  getNeedLevel: function (score) {
    if (score >= 14) {
      return 'high';
    }

    if (score >= 8) {
      return 'middle';
    }

    return 'low';
  },

  getReadyLevel: function (score) {
    if (score >= 10) {
      return 'high';
    }

    if (score >= 5) {
      return 'middle';
    }

    return 'low';
  },

  getNeedLevelText: function (level) {
    const item = NEED_LEVELS.find((entry) => entry.key === level);
    return item ? item.label : '离开必要性低';
  },

  getReadyLevelText: function (level) {
    const item = READY_LEVELS.find((entry) => entry.key === level);
    return item ? item.label : '离开准备度低';
  },

  getResultTitle: function (needLevel, readyLevel) {
    if (needLevel === 'high' && readyLevel === 'high') {
      return '你已经具备认真规划离开的条件';
    }

    if (needLevel === 'high' && readyLevel === 'middle') {
      return '离开的方向逐渐清晰，准备还要再补一程';
    }

    if (needLevel === 'high' && readyLevel === 'low') {
      return '先把自己接住，再谈离开这件事';
    }

    if (needLevel === 'middle' && readyLevel === 'high') {
      return '你可以开始为下一阶段做主动选择';
    }

    if (needLevel === 'middle' && readyLevel === 'middle') {
      return '现在更适合边观察，边准备下一步';
    }

    if (needLevel === 'middle' && readyLevel === 'low') {
      return '先把状态稳下来，再决定要不要离开';
    }

    if (readyLevel === 'high') {
      return '你并不被动，已经拥有选择的余地';
    }

    if (readyLevel === 'middle') {
      return '现在更适合先优化环境，而不是急着离开';
    }

    return '暂时不急着做离职决定，会更稳妥';
  },

  getResultSubtitle: function (needLevel, readyLevel) {
    if (needLevel === 'high') {
      if (readyLevel === 'high') {
        return '继续留在当前环境里的成本已经不低，而你手里也有一定筹码，可以把离开变成有计划的选择。';
      }

      if (readyLevel === 'middle') {
        return '你想离开的理由已经比较明确，接下来关键不是忍耐，而是把落地准备补完整。';
      }

      return '你现在承受的消耗已经值得被认真对待，眼下最重要的是先保护自己，再慢慢补足退路。';
    }

    if (needLevel === 'middle') {
      if (readyLevel === 'high') {
        return '你未必必须立刻离开，但已经具备为下一阶段做主动安排的条件。';
      }

      if (readyLevel === 'middle') {
        return '这更像一个需要边观察、边准备、边验证的阶段，而不是立刻做结论。';
      }

      return '现在还没到必须马上离开的程度，先让自己恢复一点稳定感，会比仓促决定更重要。';
    }

    if (readyLevel === 'high') {
      return '你并不是只能被动承受，现实上已经拥有一定从容度，可以认真挑选对自己更合适的下一步。';
    }

    return '现阶段更适合先优化环境、收集事实，而不是在情绪波动里给自己下重大决定。';
  },

  getMatrixActiveIndex: function (needLevel, readyLevel) {
    const rowIndex = needLevel === 'high' ? 0 : needLevel === 'middle' ? 1 : 2;
    const columnIndex = readyLevel === 'low' ? 0 : readyLevel === 'middle' ? 1 : 2;
    return rowIndex * 3 + columnIndex;
  },

  getDimensionCards: function (scores) {
    return [
      {
        title: '身心负荷',
        score: `${scores.strain} / 12`,
        summary: this.getStrainSummary(scores.strain)
      },
      {
        title: '工作错配',
        score: `${scores.mismatch} / 9`,
        summary: this.getMismatchSummary(scores.mismatch)
      },
      {
        title: '方向清晰度',
        score: `${scores.readiness} / 6`,
        summary: this.getReadinessSummary(scores.readiness)
      },
      {
        title: '手里有多少底气',
        score: `${scores.buffer} / 9`,
        summary: this.getBufferSummary(scores.buffer)
      },
      {
        title: '现实事务风险',
        score: `${scores.practical} / ${PRACTICAL_MAX_SCORE}`,
        summary: this.getPracticalSummary(scores.practical)
      },
      {
        title: '工作底线健康度',
        score: `${BASELINE_MAX_SCORE - scores.baseline} / ${BASELINE_MAX_SCORE}`,
        summary: this.getBaselineSummary(scores.baseline)
      }
    ];
  },

  getStrainSummary: function (score) {
    if (score >= 9) {
      return '你的消耗已经持续累积到比较高的水平，这多半不是一阵忙，而是身体和情绪都在反复发出提醒。';
    }

    if (score >= 5) {
      return '你已经进入持续疲惫的阶段，说明恢复、边界和工作节奏，值得被认真重新安排。';
    }

    return '你目前更像是阶段性劳累，问题未必一定要靠离开解决，仍然存在修复和调整空间。';
  },

  getMismatchSummary: function (score) {
    if (score >= 7) {
      return '你和这份工作的目标、节奏或关系模式，已经出现了比较明显的错配感。';
    }

    if (score >= 4) {
      return '你已经出现“不是做不了，而是不太想继续这样做”的信号。';
    }

    return '这份工作目前仍有一定可修复性，未必需要立刻用离开来回应当下的不舒服。';
  },

  getReadinessSummary: function (score) {
    if (score >= 5) {
      return '你对下一步已经不只是停留在想法上，而是开始形成方向和动作，这很关键。';
    }

    if (score >= 3) {
      return '你已经开始思考下一步，只是还需要把模糊想法继续收束成可执行的计划。';
    }

    return '你现在更像是很清楚自己不想继续什么，但还没真正想清楚接下来要去哪里。';
  },

  getBufferSummary: function (score) {
    if (score >= 7) {
      return '你手里的钱和现实支持，能给这次变动留出相对从容的时间。';
    }

    if (score >= 4) {
      return '你还有一点底气，但还不太适合“先走再说”这种高波动选法。';
    }

    return '你手里的底气目前偏薄，做大动作前最好先把钱和退路盘清楚。';
  },

  getPracticalSummary: function (score) {
    if (score >= 11) {
      return '你离职前后要处理的现实事项不少，社保、公积金、预期离职日、交接和证明材料这些，最好现在就一项项盘起来。';
    }

    if (score >= 6) {
      return '离职本身未必最难，真正容易出错的是时间点、手续和材料没提前理顺。';
    }

    return '你对离职前后要办的事已经有点谱了，继续按清单核对，出岔子的概率会小很多。';
  },

  getBaselineSummary: function (score) {
    if (score >= 22) {
      return '这份工作在基本劳动体验上已经明显越线，你现在的不适很可能不只是“太累”，而是底线本身在被反复消耗。';
    }

    if (score >= 14) {
      return '这份工作有多项基础条件正在持续拉低你的体感，继续留下的代价不只是情绪，还有生活质量。';
    }

    return '这份工作在基本劳动条件上还没有全面失守，眼下更需要确认是局部问题，还是长期趋势。';
  },

  getPracticalCards: function (scores) {
    return [
      {
        title: '钱和退路',
        status: scores.buffer <= 3 ? '先把钱盘清楚' : scores.buffer <= 6 ? '有一点底气' : '底气相对够',
        summary: scores.buffer <= 3
          ? '先按 3-6 个月口径测算缓冲金：固定支出、社保医保、就医、家庭责任和突发开支都要纳入。'
          : '你已有一定缓冲，建议先明确是“短暂休整后再求职”还是“持续在职过渡”，避免策略摇摆。'
      },
      {
        title: '离职日期和交接',
        status: scores.practical >= 8 ? '尽快盘时间点' : '建议提前排表',
        summary: '把离职通知、预期离职日、年假调休、交接对象、报销借款、最后薪资发放节点做成倒排表，减少尾部风险。'
      },
      {
        title: '必须到手的文件',
        status: scores.practical >= 8 ? '优先留痕' : '别忘了留底',
        summary: '离职证明、薪资证明、劳动合同、社保与工资记录、交接签字和流程记录，要提前确认责任人和交付时间。'
      },
      {
        title: '在职资产化',
        status: scores.practical >= 10 ? '别再拖了' : scores.readiness >= 4 ? '可以顺手推进' : '先列个清单',
        summary: '把可公开成果、项目方法、关键流程、人脉与推荐关系沉淀为个人资产；同时补齐体检、证件、在职证明等事项。'
      }
    ];
  },

  getPracticalAdviceList: function (scores) {
    const list = [
      '在正式提离职前，先给自己 2-3 天决策冷静期，区分“职业倦怠”与“岗位错配”两类问题。',
      '先确定预期离职窗口，再同步梳理年假调休、薪资结算、报销借款、交接安排和系统流程。',
      '所有关键节点尽量留痕：通知记录、流程截图、邮件签收、交接清单和责任边界。'
    ];

    if (scores.buffer <= 3) {
      list.push('先建立 3-6 个月缓冲预算，除住房和日常支出外，还需计入社保医保、就医和家庭责任成本。');
    } else if (scores.readiness <= 2) {
      list.push('建议在职阶段先更新简历与案例库，用“情境、任务、行动、结果”的结构整理不涉密项目成果，避免离岗后补写失真。');
    } else {
      list.push('若已进入求职阶段，建议低调推进投递与面试节奏，同时准备标准化项目案例，便于稳定输出。');
    }

    if (scores.practical >= 8) {
      list.push('涉及居住证、积分、落户、购房购车、子女入学等事项时，先核对本地对社保连续性的要求。');
      list.push('若计划保留失业金或协商解除等路径，建议提前核对当地办理口径与证据材料。');
    }

    list.push('体检、处方、在职证明、证件续办等事项，建议在职阶段完成，降低后续中断风险。');
    list.push('做好个人资料备份与联系人维护，同时严格遵守公司信息安全边界，不携带机密内容。');
    list.push('离职证明、薪资证明、合同与社保记录建议在离岗前逐项核验并留存。');
    return list;
  },

  getBaselineStatus: function (score) {
    if (score >= 22) {
      return '工作底线明显越线';
    }

    if (score >= 14) {
      return '工作底线存在持续缺口';
    }

    return '工作底线暂未明显失守';
  },

  getBaselineAdviceList: function (scores) {
    const list = [];

    if (scores.baseline >= 22) {
      list.push('这已经不只是“工作不开心”，而是基本劳动体验本身在反复越线。把离开视为风险控制会更贴近现实。');
    } else {
      list.push('你当前的不适，未必只是抗压能力问题，也可能是工作边界、休息权和协作环境正在共同消耗你。');
    }

    list.push('如果发薪稳定性、社保公积金、休息权或领导沟通方式已经出现长期问题，建议把这些写成事实清单，而不是只留在情绪里。');

    if (scores.baseline >= 14) {
      list.push('继续留下之前，先问自己：这份工作还满足最低体面劳动条件吗？如果答案越来越接近“否”，就值得认真准备退出。');
    } else {
      list.push('如果底线问题还没有全面失守，可以优先观察哪些点能修复、哪些点已经开始反复越界。');
    }

    return list;
  },

  getCareerDirectionCard: function (scores, needLevel, readyLevel) {
    const card = {
      title: '你现在是在逃，还是在追',
      tag: '边看边走',
      summary: '很多人离开一份工作时，最先感受到的是想逃开当下的不舒服。但真正决定这次转身质量的，往往不是“要不要走”，而是“你要去哪里”。',
      list: [
        '先别只盯着离开这份工作，也问问自己：我下一步到底想去哪里。',
        '一份工作结束，不等于你的职业主线结束。工作会变，但你长期适合做什么，才是更重要的事。'
      ]
    };

    if (needLevel === 'high' && readyLevel === 'low') {
      return {
        ...card,
        tag: '更像先想逃开',
        summary: '你现在最强的冲动，是先离开当前的消耗感，但去哪里、怎么走还不够清楚。眼下真正要补的，不只是勇气，而是去向。',
        list: [
          '先问自己下一站想去哪里，而不是只想尽快离开这里。',
          '先去市场上试试水，看看自己现在能拿到什么机会和价位，再决定走不走。'
        ]
      };
    }

    if (readyLevel === 'high') {
      return {
        ...card,
        tag: '已经在追下一步',
        summary: '你不只是想离开，也已经在向下一站靠近。接下来更重要的是减少摇摆，把选择变成路线。',
        list: [
          '继续把目标岗位、城市和薪酬区间写实，别让“我都想要”拖慢决策。',
          '既然已经有一些选择权，就别把自己困在“只能忍”或“必须走”的二选一里。'
        ]
      };
    }

    if (needLevel === 'middle' && readyLevel === 'middle') {
      return {
        ...card,
        tag: '边观察边找方向',
        summary: '你现在更像在一个转弯处。继续待着不算舒服，但马上走也未必最稳。这个阶段最重要的是边观察，边把方向找清楚。',
        list: [
          '先投一轮简历，知道自己的市场标价，再决定要不要离开。',
          '别把所有问题都归因给外部，也问问自己下一份工作怎样才能不再重复这些问题。'
        ]
      };
    }

    return card;
  },

  getBurnoutInsight: function (scores) {
    if (scores.strain >= 9 || scores.baseline >= 18) {
      return {
        title: '你更像哪种倦怠',
        tag: '焦虑型',
        summary: '你现在更像被持续的压力顶着走，不一定是你不想做，而是已经有点扛不住了。',
        symptom: '常见感觉：总觉得任务压着你，脑子停不下来，休息也难真正恢复。',
        cause: '更像原因：工作要求太高、恢复太少，能力和要求之间长期失衡。',
        remedy: '先对自己用这味药：先补恢复和提效，再谈去留。判断力回来以后，很多路会清楚得多。'
      };
    }

    if (scores.mismatch >= 6 && scores.strain >= 5) {
      return {
        title: '你更像哪种倦怠',
        tag: '失落型',
        summary: '你可能不是不会做，而是越做越觉得没意思，甚至会冒出“我都付出了这么多，为什么还是这样”的感觉。',
        symptom: '常见感觉：做得不算少，但越来越难从工作里获得认可感和价值感。',
        cause: '更像原因：缺认可、缺意义，或者长期看不到自己为什么还要继续这样做。',
        remedy: '先对自己用这味药：先问清楚你到底更在意钱、成长、意义还是掌控感，再决定下一步。'
      };
    }

    if (scores.mismatch >= 5) {
      return {
        title: '你更像哪种倦怠',
        tag: '厌倦型',
        summary: '你更像是对现在这套工作内容、节奏和重复感提不起劲，不一定是崩了，而是心已经不太在这儿了。',
        symptom: '常见感觉：总觉得“怎么又是这些事”，很难再从日常工作里获得新鲜感。',
        cause: '更像原因：成长感和新鲜感不足，工作模式开始重复，心里的雷达已经不买账了。',
        remedy: '先对自己用这味药：先换做法、换项目、换目标试试；如果还是没感觉，再认真考虑换方向。'
      };
    }

    return {
      title: '你更像哪种倦怠',
      tag: '轻度混合型',
      summary: '你现在的状态还没有完全滑到某一种典型倦怠里，但已经出现了一些混合信号。',
      symptom: '常见感觉：偶尔会烦、会累、会迷茫，但还没有哪个问题完全压过其他问题。',
      cause: '更像原因：工作里有局部消耗，也有一些还能修的空间，所以你才会一边难受，一边犹豫。',
      remedy: '先对自己用这味药：找出最早出现、最常重复的那个问题，先处理它，而不是一次想解决全部。'
    };
  },

  getNextFocusGuide: function (scores, needLevel, readyLevel) {
    if (scores.strain >= 9) {
      return {
        title: '下一步更适合先做什么',
        tag: '先搞恢复',
        summary: '你现在最缺的，不是新机会，而是恢复判断力。睡眠、体力和情绪稳住以后，很多决定都会更准。',
        list: [
          '先给自己留一个恢复窗口，别在边崩边扛的时候做大决定。',
          '如果想试副业，优先做能补能量、低成本、可暂停的，不要再给自己加第二份高压。'
        ]
      };
    }

    if (scores.buffer <= 3) {
      return {
        title: '下一步更适合先做什么',
        tag: '先搞钱',
        summary: '你眼下的第一优先级，是把现金流和安全感稳住。先把已有经验卖出去，再谈理想路线，会更稳。',
        list: [
          '优先考虑能快速变现的同岗跳槽、熟悉项目、短期合作或相近兼职。',
          '别让“想换人生”压过“先活下来”，先稳住，再升级。'
        ]
      };
    }

    if (readyLevel === 'high' || needLevel === 'middle' || scores.mismatch >= 6) {
      return {
        title: '下一步更适合先做什么',
        tag: '先搞发展',
        summary: '你现在更适合把眼光放到下一阶段，去找信息更密集、高手更多、机会更多的地方练能力和看世界。',
        list: [
          '别急着一步到位，先用轻量副业、行业交流、项目合作去验证方向。',
          '如果你对新方向有好奇，先去试，不要只在脑子里想。热爱这件事，最好先奔现。'
        ]
      };
    }

    return {
      title: '下一步更适合先做什么',
      tag: '先稳住再看',
      summary: '你现在最适合做的，不是把所有答案一下子找齐，而是先稳住当前节奏，再逐步看清下一步。',
      list: [
        '先保留观察窗口，给自己一点试错空间。',
        '小步试、小步看，比一次性押上全部更适合你现在。'
      ]
    };
  },

  getAdviceList: function (scores, needLevel, readyLevel) {
    const summary = `从这次评估来看，你当下处在“${this.getNeedLevelText(needLevel)}、${this.getReadyLevelText(readyLevel)}”的位置。换句话说，你现在需要同时回答两个问题：继续留下的代价有多大，以及如果离开，你是否接得住自己。`;

    let interpretation = '';
    if (needLevel === 'high' && readyLevel === 'high') {
      interpretation = '继续留下的成本已经比较高，而你也具备一定转身条件。这个阶段更适合把离开从情绪冲动，变成一个有节奏、有边界、有安排的职业动作。';
    } else if (needLevel === 'high' && readyLevel === 'middle') {
      interpretation = '你想离开的理由已经比较充分，只是准备还没有完全跟上。比起继续硬撑，或者一下子裸辞，更成熟的做法是给自己一小段明确期限，把简历、机会信息和现金流预案补齐。';
    } else if (needLevel === 'high' && readyLevel === 'low') {
      interpretation = '你当下最需要的，不是马上做一个“走还是留”的大决定，而是先止损。先让自己从持续透支里缓下来，再谈职业动作，通常会更安全。';
    } else if (needLevel === 'middle' && readyLevel === 'high') {
      interpretation = '你未必必须马上辞职，但已经具备切换筹码。这个阶段的关键，不是被动忍着，而是开始把选择权拿回到自己手里。';
    } else if (needLevel === 'middle' && readyLevel === 'middle') {
      interpretation = '你现在处在一个很典型的“可以开始准备，但不必急着定论”的阶段。比较好的做法，是让恢复、观察和准备三件事同时往前走。';
    } else if (needLevel === 'middle' && readyLevel === 'low') {
      interpretation = '你的不舒服是真实的，但还没有足够条件支持立刻离开。先把状态和现实盘稳，再回头看这份工作是否真的走到了非离开不可的地步。';
    } else if (readyLevel === 'high') {
      interpretation = '你当前并不是“必须逃开”，而是已经拥有了更从容的选择权。接下来更适合把辞职从情绪决定，升级成职业策略。';
    } else if (readyLevel === 'middle') {
      interpretation = '目前更像一个需要优化现状、保留观察窗口的阶段。你不需要急着用辞职，来一次性解决所有问题。';
    } else {
      interpretation = '现阶段离开的必要性和准备度都不算高，更适合先通过休息、沟通和环境调整，验证问题到底是暂时的，还是已经不可修复。';
    }

    const caution = scores.strain >= 10
      ? '如果你已经持续失眠、明显躯体化、情绪频繁失控，或者反复出现“真的撑不下去”的感觉，请把专业心理支持或医疗帮助，放进这次决策里一起考虑。'
      : '这份结果不是替你下结论，而是提醒你：把情绪、事实和资源分开来看，你会更容易做出不后悔的决定。';

    return [summary, interpretation, caution];
  },

  getActionList: function (scores, needLevel, readyLevel) {
    const actions = [];

    if (scores.strain >= 8) {
      actions.push('先做 48-72 小时止损安排：优先恢复睡眠与体力，再进入离职与求职判断，避免在高压期做关键决定。');
    } else {
      actions.push('先写出当前最影响你的 2-3 个问题，并区分“可修复问题”与“结构性错配问题”。');
    }

    if (scores.readiness <= 2) {
      actions.push('把去向方案写实：选择“短期休整”或“立即求职”，并明确目标岗位、城市、薪酬区间与时间边界。');
    } else {
      actions.push('低调更新简历，按“情境、任务、行动、结果”的结构重构关键经历，并用 3 个对标岗位校准能力缺口和投递策略。');
    }

    if (scores.buffer <= 3) {
      actions.push('先建立 3-6 个月现金流方案，覆盖固定支出、社保医保和突发开销，再决定离岗节奏。');
    } else if (needLevel === 'high' && readyLevel === 'high') {
      actions.push('确定预期离职日后，倒推通知、交接、求职与休整节奏，确保切换过程可控。');
    } else {
      actions.push('设定复盘节点，同时把年假、社保连续性、交接计划和关键文件清单一次性拉齐。');
    }

    return actions;
  },

  getEnhancedReport: function (scores, needLevel, readyLevel) {
    return {
      summary: this.getEnhancedSummary(scores, needLevel, readyLevel),
      blockers: this.getCoreBlockers(scores, needLevel, readyLevel),
      riskList: this.getRiskList(scores, needLevel, readyLevel),
      actionPlan: this.getSevenDayPlan(scores, needLevel, readyLevel),
      thirtyDayPlan: this.getThirtyDayPlan(scores, needLevel, readyLevel),
      recommendation: this.getRecommendation(scores, needLevel, readyLevel)
    };
  },

  getEnhancedAuthorityMeta: function (scores, needLevel, readyLevel) {
    const pressureLevel = scores.strain >= 8 ? '高压恢复' : '压力识别';
    const readinessFocus = scores.readiness <= 2 ? '方向澄清' : '机会判断';
    const floorSignal = scores.baseline >= 18 ? '底线风险校验' : '工作边界校验';

    return {
      eyebrow: '研究视角增强版',
      title: '不是一句“建议离职”，而是按专业框架拆解你的决策风险',
      subtitle: `当前结果采用组织心理学、职业决策与压力恢复三组视角交叉判断，并结合国内生涯咨询实践，重点查看 ${pressureLevel}、${readinessFocus} 与 ${floorSignal}。`,
      institutionList: [
        '美国职业咨询协会（NCDA）职业决策研究视角',
        '斯坦福大学职业发展中心职业转型研究视角',
        '麻省理工学院斯隆管理学院职业动态研究视角',
        '哈佛商学院职业发展与领导力研究视角'
      ],
      disciplineList: [
        '组织心理学',
        '职业决策科学',
        '压力与恢复研究',
        '行为经济学'
      ],
      modelList: [
        '工作要求与资源模型',
        '生涯资本与转职准备度框架',
        '压力评估与恢复窗口模型',
        '损失厌恶与机会成本判断'
      ],
      rigorList: [
        '先看继续留下的消耗，再看离开的现实承接能力，避免只凭情绪做决定。',
        '把身心负荷、工作错配、现金缓冲、方向清晰度和底线信号拆开评分，减少“一个问题盖过全部问题”。',
        '结论只给到可执行下一步，不直接替你做人生决定，保留你自己的判断权。'
      ],
      statList: [
        { label: '决策维度', value: '6 个核心变量' },
        { label: '交叉判断', value: '3 层风险筛查' },
        { label: '增强模块', value: '4 个专业模块' }
      ]
    };
  },

  getLockedEnhancedPreview: function (scores, needLevel, readyLevel) {
    const summary = this.getEnhancedSummary(scores, needLevel, readyLevel);
    const risks = this.getRiskList(scores, needLevel, readyLevel).slice(0, 2);

    return {
      title: '解锁后你会看到什么',
      subtitle: '不是模板化鸡汤，而是针对你当前状态给出可执行决策拆解。',
      highlightList: [
        '结合国内生涯咨询实践拆解核心矛盾',
        '识别“继续留下”和“直接离开”两侧风险',
        '给出财务缓冲、资产化准备、求职过渡的分步清单'
      ],
      sampleList: [
        `预览摘要：${summary}`,
        ...(risks.map((item) => `预览风险：${item}`))
      ]
    };
  },

  getEnhancedSummary: function (scores, needLevel, readyLevel) {
    if (scores.baseline >= 22) {
      return '你当前最大的冲突，不只是要不要离开，而是这份工作在基本劳动条件上已经越过了你的底线。增强版更适合帮你把“受不了”翻译成可执行的退出准备。';
    }

    if (needLevel === 'high' && readyLevel === 'low') {
      return '你眼下最核心的矛盾，是离开的必要性已经很高，但现实缓冲和方向准备都还没跟上。增强版更适合帮你先止损，再建立真正可执行的退路。';
    }

    if (needLevel === 'high' && readyLevel !== 'low') {
      return '你离开的理由已经够清楚了，现在真正决定风险高低的，不是要不要走，而是你是否能用更稳的节奏完成切换。';
    }

    if (readyLevel === 'high') {
      return '你现在拥有一定选择权，最值得做的不是情绪性离开，而是把判断转成更明确的职业策略。';
    }

    return '你当前更像处在“尚未到必须离开，但需要尽快看清问题”的阶段。增强版重点是帮你识别真实卡点，而不是给一个简单走或留。';
  },

  getCoreBlockers: function (scores, needLevel, readyLevel) {
    const blockers = [];

    if (scores.strain >= 8) {
      blockers.push('你当前最大的阻力，是长期消耗正在影响判断质量。先恢复状态，后面的准备才会更有效。');
    }

    if (scores.practical >= 9) {
      blockers.push('你离职前的现实布局还没盘清，预期离职日、社保、证明材料和在职能办的事，如果不先排顺序，离职后会更乱。');
    }

    if (scores.buffer <= 3) {
      blockers.push('现实缓冲偏薄会放大焦虑，让你更容易在高压中做出“先走再说”的高风险选择。');
    }

    if (scores.readiness <= 2) {
      blockers.push('你对下一步方向还不够具体，这会让离开变成“离开当前问题”，却没有真正走向下一站。');
    }

    if (scores.mismatch >= 6) {
      blockers.push('你和当前工作的目标或关系模式已经明显错配，继续硬扛带来的收益正在下降。');
    }

    if (scores.baseline >= 18) {
      blockers.push('这份工作在发薪、边界、休息权或领导沟通方式上已经出现明显底线缺口，这会让“继续留下”本身不断抬价。');
    }

    if (blockers.length === 0) {
      blockers.push('你当前的主要卡点不是单一风险，而是需要给自己一个明确观察周期，把修复和准备并行推进。');
    }

    return blockers.slice(0, 3);
  },

  getRiskList: function (scores, needLevel, readyLevel) {
    const riskList = [];

    if (needLevel === 'high' && readyLevel === 'low') {
      riskList.push('如果现在直接离开，最可能出现的问题是状态还没恢复，求职判断也会跟着失真。');
    }

    if (scores.buffer <= 3) {
      riskList.push('现金流缓冲不足会压缩你的试错空间，让你更容易为了尽快止损而接受不合适的新机会。');
    }

    if (scores.practical >= 8) {
      riskList.push('如果先离职、后补手续，预期离职日、社保续缴、离职证明或证件办理这些“小事”，很容易变成真麻烦。');
    }

    if (scores.readiness <= 2) {
      riskList.push('方向模糊时匆忙投递，容易把原本的错配关系复制到下一份工作里。');
    }

    if (scores.baseline >= 20) {
      riskList.push('如果你长期处在发薪不稳、休息权被侵占或明显 PUA 的环境里，继续留下本身也在累积额外风险。');
    }

    if (scores.strain < 8 && needLevel === 'low') {
      riskList.push('如果现在把所有不舒服都归结为“必须离开”，反而可能错过当前环境里还能修复的部分。');
    }

    if (riskList.length === 0) {
      riskList.push('你当前的主要风险不是做决定，而是长期停留在模糊状态里，既没有真正修复，也没有真正准备。');
    }

    return riskList.slice(0, 3);
  },

  getSevenDayPlan: function (scores, needLevel, readyLevel) {
    const plan = [];

    plan.push('第 1-2 天：完成决策盘点，明确是短期疲劳还是岗位错配；同步记录最消耗你的 3 个场景。');

    if (scores.readiness <= 2) {
      plan.push('第 3-4 天：写清离职后路径（休整或求职），并明确目标岗位、城市、薪资区间与恢复周期。');
    } else {
      plan.push('第 3-4 天：更新简历并按“情境、任务、行动、结果”的结构整理案例库，安排 2 次目标行业交流，校准市场匹配度。');
    }

    if (scores.buffer <= 3) {
      plan.push('第 5-7 天：建立 3-6 个月现金流预算表，覆盖住房、社保医保、日常和突发支出。');
    } else {
      plan.push('第 5-7 天：确定预计离职窗口，并倒排年假、交接、投递节奏与休整安排。');
    }

    if (scores.practical >= 8) {
      plan.push('额外动作：把离职证明、薪资证明、合同、交接签字、报销借款、证件续办做成核销清单。');
    }

    return plan.slice(0, 4);
  },

  getThirtyDayPlan: function (scores, needLevel, readyLevel) {
    const plan = [];
    const closeOutStep = scores.baseline >= 18
      ? '第 4 周完成手续收口：逐项核对离职证明、薪资与社保记录、报销借款和证件事项；若存在底线越线问题，同步整理证据留痕。'
      : '第 4 周完成手续收口：逐项核对离职证明、薪资与社保记录、报销借款和证件事项。';

    if (scores.strain >= 8) {
      plan.push('第 1 周先恢复状态：把睡眠、体力和情绪稳定下来，并确认这次变动的真实目标。');
    } else {
      plan.push('第 1 周确定路径：明确继续观察、在职过渡或正式离岗三种方案中的主方案。');
    }

    plan.push('第 2 周启动资产化准备：完成成果归档、简历迭代、关键关系维护，并核查社保连续性方案。');
    plan.push('第 3 周推进过渡执行：如确定离岗，完成 1 对 1 沟通与正式流程；如继续在职，按周推进投递与面试。');
    plan.push(closeOutStep);

    return plan.slice(0, 4);
  },

  getRecommendation: function (scores, needLevel, readyLevel) {
    if (scores.practical >= 10) {
      return '增强版建议：你的关键风险在执行层。建议先完成离职流程倒排、社保连续性方案和交接清单，再决定离岗时间。';
    }

    if (scores.baseline >= 22) {
      return '增强版建议：当劳动底线持续越线时，重点不是继续自我消化，而是尽快进入有证据、有节奏的退出准备。';
    }

    if (needLevel === 'high' && readyLevel === 'high') {
      return '增强版建议：你已具备过渡条件。参考国内职业咨询常用做法，下一步应聚焦“时间边界 + 资产化准备 + 口碑交接”三件事。';
    }

    if (needLevel === 'high') {
      return '增强版建议：优先把自我保护和现金流稳定放在第一位，再推进简历、案例和求职节奏，目标是“稳健离开”而非“快速离开”。';
    }

    if (readyLevel === 'high') {
      return '增强版建议：你已有较强选择权，建议主动设计下一阶段路径，用阶段性目标替代情绪化二选一。';
    }

    return '增强版建议：先完成事实盘点与路径设计，再做重大决定。好的离职决策，重点在于降低后悔成本，而不是追求短期情绪释放。';
  },

  onShareAppMessage: function () {
    this.prepareShareUnlock();
    const growthState = this.data.growthState;
    const shouldUnlock = !growthState.enhancedUnlocked;

    wx.showToast({
      title: growthState.enhancedUnlocked ? '分享你的结果卡片' : '分享成功后已解锁增强版',
      icon: 'none'
    });

    const inviteToken = `${Date.now()}`;
    const resultTitle = this.data.resultTitle;

    // 分享标题池：多维度覆盖不同用户心理和场景
    const shareTitles = [
      // 理性决策型
      `离职还是留下？我刚做了一次深度的职业决策评估`,
      `这份分析说：${resultTitle}。推荐你也测测`,
      `提离职前，建议先看看这份 6 维度的决策报告`,
      
      // 情感共鸣型
      `凌晨2点还在想辞职的事？这个测试帮我理清了思路`,
      `不是想走，只是想知道自己还能撑多久`,
      `终于有人把"要不要辞职"这件事说清楚了`,
      
      // 结果导向型
      `测完发现我是"${resultTitle}"类型，准得有点可怕`,
      `我的离职风险评估：${resultTitle}。你的呢？`,
      
      // 社交互动型
      `如果你也在纠结要不要走，花5分钟测一下`,
      `同事问我为什么还不辞职，我把这个测试推荐给了他`,
      
      // 悬念好奇型
      `我不建议你冲动辞职，除非你测过这个……`,
      `拒绝冲动离职！这份决策评估帮我理清了思路`,
      `辞职前必看：6个维度评估你现在该不该走`
    ];
    const randomTitle = shareTitles[Math.floor(Math.random() * shareTitles.length)];

    return {
      title: randomTitle,
      path: `/pages/index/index?inviteSession=${this.resultSessionId}&inviteToken=${inviteToken}`,
      imageUrl: '/assets/images/share-cover.png',
      success: () => {
        // 分享成功，获得积分
        this.addSharePoints('friend');
        if (shouldUnlock) {
          wx.showToast({
            title: `分享成功！获得${SHARE_POINTS}决策值`,
            icon: 'none'
          });
        }
      },
      fail: () => {
        this.shareUnlockIntentAt = 0;
      }
    };
  },

  onShareTimeline: function () {
    this.prepareShareUnlock();
    const resultTitle = this.data.resultTitle;

    const timelineTitles = [
      `做了一个职业决策测试，结果是"${resultTitle}"。原来我对工作的真实态度是这样的……`,
      `5分钟，6个维度，终于搞清楚自己到底该不该辞职了`,
      `最近一直在纠结要不要离职，这个测试给了我一些新视角`,
      `工作不开心？先别急着交辞职信，测完这个再决定`,
      `不是劝你辞职，也不是劝你忍耐，只是想帮你理清现状`,
      `测完这个离职决策测试，我发现自己是"${resultTitle}"类型`,
      `如果你也在"要不要辞职"之间反复横跳，建议先测一下`
    ];
    const randomTitle = timelineTitles[Math.floor(Math.random() * timelineTitles.length)];

    return {
      title: randomTitle,
      query: `inviteSession=${this.resultSessionId}`,
      imageUrl: '/assets/images/share-cover.png',
      success: () => {
        // 分享成功，获得积分
        this.addSharePoints('timeline');
        if (!this.data.growthState.enhancedUnlocked) {
          wx.showToast({
            title: `分享成功！获得${SHARE_POINTS}决策值`,
            icon: 'none'
          });
        }
      },
      fail: () => {
        this.shareUnlockIntentAt = 0;
      }
    };
  },

  // 添加分享积分
  addSharePoints: function (shareType) {
    const store = wx.getStorageSync(GROWTH_STORAGE_KEY) || {};
    const todayKey = this.getTodayKey();
    const shareKey = `share_${shareType}_${todayKey}`;

    // 每日每种类型的分享只奖励一次
    if (store[shareKey]) {
      return;
    }

    store.decisionPoints = (store.decisionPoints || 0) + SHARE_POINTS;
    store[shareKey] = true;
    wx.setStorageSync(GROWTH_STORAGE_KEY, store);

    // 更新页面显示的积分
    this.setData({
      decisionPoints: store.decisionPoints
    });

    console.log(`分享获得${SHARE_POINTS}积分，类型：${shareType}`);
  }
});
