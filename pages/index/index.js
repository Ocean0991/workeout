const { ASSESSMENT_META } = require('../../utils/assessment');

const GROWTH_STORAGE_KEY = 'quitAssessmentGrowthState';
const SHARE_UNLOCK_REQUIRED = 1;
const INVITE_OPEN_POINTS = 30; // 被邀请人点开链接获得30积分
const INVITE_COMPLETE_POINTS = 50; // 被邀请人完成测试获得50积分

Page({
  data: {
    loading: false,
    questionCount: ASSESSMENT_META.questionCount,
    estimatedMinutesText: ASSESSMENT_META.estimatedMinutesText,
    hasHistoryResult: false,
    historyResultTitle: '',
    historyResultMeta: '',
    historyAnsweredAtText: '',
    decisionPoints: 0 // 决策值积分
  },

  onLoad: function (options) {
    this.processInviteOpen(options);
    this.loadHistoryResult();
    this.loadDecisionPoints();
  },

  onShow: function () {
    this.loadHistoryResult();
    this.loadDecisionPoints();
  },

  // 加载决策值积分
  loadDecisionPoints: function () {
    const store = wx.getStorageSync(GROWTH_STORAGE_KEY) || {};
    this.setData({
      decisionPoints: store.decisionPoints || 0
    });
  },

  // 显示决策值积分规则
  showPointsGuide: function () {
    wx.showModal({
      title: `💎 ${this.data.decisionPoints} 决策值`,
      content: '获取方式：\n• 完成测试：+20\n• 分享结果：+10\n• 接受邀请：+30\n• 好友完成测试：+50\n\n50积分可解锁增强版报告',
      showCancel: false,
      confirmText: '知道了'
    });
  },

  processInviteOpen: function (options) {
    if (!options || !options.inviteSession || !options.inviteToken) {
      return;
    }

    const store = wx.getStorageSync(GROWTH_STORAGE_KEY) || {};
    const inviteClaims = store.inviteClaims || {};
    const claimKey = `${options.inviteSession}:${options.inviteToken}`;

    // 如果已经领取过这个邀请奖励，直接返回
    if (inviteClaims[claimKey]) {
      return;
    }

    // 被邀请人点开链接，立即获得积分
    const openKey = `invite_open_${claimKey}`;
    if (!store[openKey]) {
      store.decisionPoints = (store.decisionPoints || 0) + INVITE_OPEN_POINTS;
      store[openKey] = true;
      wx.setStorageSync(GROWTH_STORAGE_KEY, store);

      // 更新显示的积分
      this.setData({
        decisionPoints: store.decisionPoints
      });

      wx.showToast({
        title: `接受邀请！获得${INVITE_OPEN_POINTS}决策值`,
        icon: 'none',
        duration: 2000
      });
    }

    // 存储邀请关系，等待被邀请人完成测试后再发放额外奖励
    const pendingInvites = store.pendingInvites || {};
    pendingInvites[claimKey] = {
      inviteSession: options.inviteSession,
      inviteToken: options.inviteToken,
      invitedAt: Date.now(),
      completed: false
    };
    store.pendingInvites = pendingInvites;
    wx.setStorageSync(GROWTH_STORAGE_KEY, store);
  },

  // 处理邀请完成 - 在结果页调用
  processInviteComplete: function () {
    const store = wx.getStorageSync(GROWTH_STORAGE_KEY) || {};
    const pendingInvites = store.pendingInvites || {};
    const sessions = store.sessions || {};
    const inviteClaims = store.inviteClaims || {};

    let hasNewUnlock = false;

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

      // 给邀请人增加解锁进度
      targetSession.shareUnlockProgress = Math.min(
        SHARE_UNLOCK_REQUIRED,
        (targetSession.shareUnlockProgress || 0) + 1
      );
      targetSession.enhancedUnlocked = targetSession.shareUnlockProgress >= SHARE_UNLOCK_REQUIRED;
      sessions[invite.inviteSession] = targetSession;

      // 标记为已领取
      inviteClaims[claimKey] = true;
      invite.completed = true;
      hasNewUnlock = true;
    });

    if (hasNewUnlock) {
      store.sessions = sessions;
      store.inviteClaims = inviteClaims;
      store.pendingInvites = pendingInvites;
      wx.setStorageSync(GROWTH_STORAGE_KEY, store);
    }

    return hasNewUnlock;
  },

  startTest: function() {
    if (this.data.loading) {
      return;
    }

    this.setData({ loading: true });

    wx.navigateTo({
      url: '/pages/question/question',
      complete: () => {
        this.setData({ loading: false });
      },
      fail: () => {
        wx.showToast({
          title: '页面打开失败',
          icon: 'none'
        });
      }
    });
  },

  openHistoryResult: function () {
    wx.navigateTo({
      url: '/pages/result/result',
      fail: () => {
        wx.showToast({
          title: '历史结果打开失败',
          icon: 'none'
        });
      }
    });
  },

  loadHistoryResult: function () {
    const result = wx.getStorageSync(ASSESSMENT_META.storageKey);

    if (!result || !result.categoryScores) {
      this.setData({
        hasHistoryResult: false,
        historyResultTitle: '',
        historyResultMeta: '',
        historyAnsweredAtText: ''
      });
      return;
    }

    const leaveNeedScore = result.leaveNeedScore || 0;
    const readinessScore = result.readinessScore || 0;
    const needLevel = this.getNeedLevel(leaveNeedScore);
    const readyLevel = this.getReadyLevel(readinessScore);
    const answeredAtText = this.formatDateTime(result.answeredAt);

    this.setData({
      hasHistoryResult: true,
      historyResultTitle: this.getResultTitle(needLevel, readyLevel),
      historyResultMeta: `${this.getNeedLevelText(needLevel)} × ${this.getReadyLevelText(readyLevel)}`,
      historyAnsweredAtText: answeredAtText ? `最近测试：${answeredAtText}` : '最近测试：刚刚'
    });
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
    if (level === 'high') {
      return '离开必要性高';
    }

    if (level === 'middle') {
      return '离开必要性中';
    }

    return '离开必要性低';
  },

  getReadyLevelText: function (level) {
    if (level === 'high') {
      return '离开准备度高';
    }

    if (level === 'middle') {
      return '离开准备度中';
    }

    return '离开准备度低';
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

  formatDateTime: function (timestamp) {
    if (!timestamp) {
      return '';
    }

    const date = new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    const hours = `${date.getHours()}`.padStart(2, '0');
    const minutes = `${date.getMinutes()}`.padStart(2, '0');
    return `${month}-${day} ${hours}:${minutes}`;
  },

  onShareAppMessage: function () {
    const shareTitles = [
      '离职还是留下？这个测试帮我理清了思路',
      '如果你也在纠结要不要辞职，花5分钟测一下',
      '拒绝情绪化提桶！6个维度评估你现在该不该走',
      '不是想走，只是想知道自己还能撑多久',
      '凌晨2点还在想辞职的事？建议你先看看这个',
      '终于有人把"要不要辞职"这件事说清楚了',
      '测完这个，我发现自己对工作的忍耐度比想象中___',
      '同事问我为什么还不辞职，我把这个测试甩给了他',
      '辞职前必看：6个维度评估你的离职 readiness',
      '不是劝你辞职，也不是劝你忍耐，只是想帮你理清现状'
    ];
    const randomTitle = shareTitles[Math.floor(Math.random() * shareTitles.length)];

    return {
      title: randomTitle,
      path: '/pages/index/index',
      imageUrl: '/assets/images/share-cover.png'
    };
  },

  onShareTimeline: function () {
    const timelineTitles = [
      '做了一个职业决策测试，终于搞清楚自己到底该不该辞职了',
      '5分钟，6个维度，帮你判断现在是否适合离职',
      '最近一直在纠结要不要离职，这个测试给了我一些新视角',
      '工作不开心？先别急着交辞职信，测完这个再决定',
      '不是标准答案，而是帮你梳理现状的参考'
    ];
    const randomTitle = timelineTitles[Math.floor(Math.random() * timelineTitles.length)];

    return {
      title: randomTitle,
      query: '',
      imageUrl: '/assets/images/share-cover.png'
    };
  }
});
