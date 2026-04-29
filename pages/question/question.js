const { QUESTION_BANK, SCORE_KEYS, ASSESSMENT_META } = require('../../utils/assessment');

function createEmptyScores() {
  return SCORE_KEYS.reduce((accumulator, key) => {
    accumulator[key] = 0;
    return accumulator;
  }, {});
}

Page({
  data: {
    currentStep: 1,
    totalSteps: QUESTION_BANK.length,
    progress: (1 / QUESTION_BANK.length) * 100,
    remainingHint: ASSESSMENT_META.estimatedMinutesText,
    loading: false,
    currentQuestion: QUESTION_BANK[0],
    currentSelection: '',
    primaryActionText: '下一题',
    answers: {
      selectedOptions: {},
      categoryScores: createEmptyScores()
    }
  },

  handleOptionSelect: function (e) {
    const step = parseInt(e.currentTarget.dataset.step, 10);
    const value = e.currentTarget.dataset.value;
    this.updateAnswer(step, value);
  },

  updateAnswer: function (step, value) {
    const answers = {
      ...this.data.answers
    };
    const selectedOptions = {
      ...(answers.selectedOptions || {})
    };

    selectedOptions[step] = value;
    answers.selectedOptions = selectedOptions;
    answers.categoryScores = this.calculateCategoryScores(selectedOptions);

    this.setData({
      answers,
      currentSelection: value
    });
  },

  calculateCategoryScores: function (selectedOptions) {
    const totals = createEmptyScores();

    QUESTION_BANK.forEach((question, index) => {
      const step = index + 1;
      const selectedValue = selectedOptions[step];

      if (!selectedValue) {
        return;
      }

      const option = question.options.find((item) => item.value === selectedValue);

      if (!option || !option.scores) {
        return;
      }

      Object.keys(option.scores).forEach((key) => {
        totals[key] += option.scores[key];
      });
    });

    return totals;
  },

  goNext: function () {
    if (this.data.loading || !this.data.currentSelection) {
      return;
    }

    this.nextStep(this.data.currentStep);
  },

  nextStep: function (currentStep) {
    if (currentStep < this.data.totalSteps) {
      this.updateStepView(currentStep + 1);
      return;
    }

    this.setData({ loading: true });

    setTimeout(() => {
      const resultPayload = this.buildResultPayload();
      wx.setStorageSync(ASSESSMENT_META.storageKey, resultPayload);
      wx.navigateTo({
        url: '../result/result'
      });
      this.setData({ loading: false });
    }, 700);
  },

  buildResultPayload: function () {
    const categoryScores = this.data.answers.categoryScores;
    const leaveNeedScore = categoryScores.strain + categoryScores.mismatch;
    const readinessScore = categoryScores.readiness + categoryScores.buffer;

    return {
      selectedOptions: this.data.answers.selectedOptions,
      categoryScores,
      leaveNeedScore,
      readinessScore,
      answeredAt: Date.now()
    };
  },

  handleHeaderAction: function () {
    if (this.data.loading) {
      return;
    }

    if (this.data.currentStep > 1) {
      this.updateStepView(this.data.currentStep - 1);
      return;
    }

    wx.showModal({
      title: '退出测试',
      content: '当前页面里的填写进度会保留，确定先回到首页吗？',
      confirmText: '退出',
      cancelText: '继续测试',
      success: ({ confirm }) => {
        if (!confirm) {
          return;
        }

        wx.navigateBack({
          fail: () => {
            wx.redirectTo({
              url: '../index/index'
            });
          }
        });
      }
    });
  },

  updateStepView: function (step) {
    const currentQuestion = QUESTION_BANK[step - 1];
    const currentSelection = this.data.answers.selectedOptions[step] || '';

    this.setData({
      currentStep: step,
      currentQuestion,
      currentSelection,
      progress: (step / this.data.totalSteps) * 100,
      remainingHint: this.getRemainingHint(step),
      primaryActionText: step === this.data.totalSteps ? '查看结果' : '下一题'
    });
  },

  getRemainingHint: function (step) {
    const remainingSteps = this.data.totalSteps - step;

    if (remainingSteps <= 1) {
      return '快完成了，马上就能看到结果';
    }

    if (remainingSteps <= 4) {
      return '预计还需 1-2 分钟';
    }

    return ASSESSMENT_META.estimatedMinutesText;
  }
});
