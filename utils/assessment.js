const SCORE_KEYS = [
  'strain',
  'mismatch',
  'readiness',
  'buffer',
  'practical',
  'baseline'
];

const QUESTION_BANK = [
  {
    id: 1,
    category: '身心负荷',
    title: '最近两周，一想到要开始工作，你最常出现的状态是？',
    options: [
      { value: 'A', label: 'A', text: '基本平稳', desc: '偶尔会累，但还在可承受范围', scores: { strain: 0 } },
      { value: 'B', label: 'B', text: '有些抗拒', desc: '会拖延或提不起劲', scores: { strain: 1 } },
      { value: 'C', label: 'C', text: '明显烦躁', desc: '想到工作就紧绷或心烦', scores: { strain: 2 } },
      { value: 'D', label: 'D', text: '持续想逃开', desc: '一想到工作就很消耗', scores: { strain: 3 } }
    ]
  },
  {
    id: 2,
    category: '身心负荷',
    title: '这份工作最近对你的睡眠、食欲或身体状态影响有多大？',
    options: [
      { value: 'A', label: 'A', text: '几乎没有', desc: '身体状态基本稳定', scores: { strain: 0 } },
      { value: 'B', label: 'B', text: '偶尔会受影响', desc: '会累，但能恢复', scores: { strain: 1 } },
      { value: 'C', label: 'C', text: '经常受影响', desc: '睡眠、胃口或身体反应变差', scores: { strain: 2 } },
      { value: 'D', label: 'D', text: '影响已经明显', desc: '身体在持续提醒你', scores: { strain: 3 } }
    ]
  },
  {
    id: 3,
    category: '身心负荷',
    title: '下班以后，你恢复到“像自己”的速度如何？',
    options: [
      { value: 'A', label: 'A', text: '恢复得快', desc: '还有精力照顾生活', scores: { strain: 0 } },
      { value: 'B', label: 'B', text: '要缓一会儿', desc: '偶尔需要独处回血', scores: { strain: 1 } },
      { value: 'C', label: 'C', text: '大多恢复不过来', desc: '晚上基本只够恢复体力', scores: { strain: 2 } },
      { value: 'D', label: 'D', text: '长期恢复不了', desc: '休息也很难真正缓过来', scores: { strain: 3 } }
    ]
  },
  {
    id: 4,
    category: '身心负荷',
    title: '你现在的不舒服，更像是哪种情况？',
    options: [
      { value: 'A', label: 'A', text: '短期忙累', desc: '最近一阵子强度偏高', scores: { strain: 0 } },
      { value: 'B', label: 'B', text: '持续一段时间', desc: '已经反复出现 1-2 个月', scores: { strain: 1 } },
      { value: 'C', label: 'C', text: '长期存在', desc: '至少 3 个月都没真正缓解', scores: { strain: 2 } },
      { value: 'D', label: 'D', text: '越来越重', desc: '不仅没缓解，还在加剧', scores: { strain: 3 } }
    ]
  },
  {
    id: 5,
    category: '工作合不合适',
    title: '如果这份工作的节奏、加班和合作方式都明显变好，你还愿意再干 3 个月吗？',
    options: [
      { value: 'A', label: 'A', text: '愿意', desc: '说明问题可能还有修复空间', scores: { mismatch: 0 } },
      { value: 'B', label: 'B', text: '可能愿意', desc: '要看改善是否真实持续', scores: { mismatch: 1 } },
      { value: 'C', label: 'C', text: '大概率不想', desc: '就算改善也未必想留下', scores: { mismatch: 2 } },
      { value: 'D', label: 'D', text: '完全不想', desc: '这份工作本身就不想继续了', scores: { mismatch: 3 } }
    ]
  },
  {
    id: 6,
    category: '工作合不合适',
    title: '这份工作和你未来 1-2 年真正想走的方向，搭不搭？',
    options: [
      { value: 'A', label: 'A', text: '比较匹配', desc: '还在我想走的路上', scores: { mismatch: 0 } },
      { value: 'B', label: 'B', text: '部分匹配', desc: '有价值，但不是最理想', scores: { mismatch: 1 } },
      { value: 'C', label: 'C', text: '不太匹配', desc: '越来越像在绕路', scores: { mismatch: 2 } },
      { value: 'D', label: 'D', text: '明显不搭', desc: '继续做下去会偏离我想要的生活', scores: { mismatch: 3 } }
    ]
  },
  {
    id: 7,
    category: '工作合不合适',
    title: '最近 3 个月，这份工作还给你留下了什么？',
    options: [
      { value: 'A', label: 'A', text: '还有成长和积累', desc: '能学到东西，也有价值感', scores: { mismatch: 0 } },
      { value: 'B', label: 'B', text: '主要是收入稳定', desc: '成长一般，但现实价值还在', scores: { mismatch: 1 } },
      { value: 'C', label: 'C', text: '只剩惯性', desc: '做着做着不知道意义在哪', scores: { mismatch: 2 } },
      { value: 'D', label: 'D', text: '几乎没有正反馈', desc: '消耗明显大于收获', scores: { mismatch: 3 } }
    ]
  },
  {
    id: 8,
    category: '方向清晰度',
    title: '如果未来 3-6 个月离开现在这份工作，你下一步想干什么，自己心里有多清楚？',
    options: [
      { value: 'A', label: 'A', text: '很清楚', desc: '目标岗位或路径已经明确', scores: { readiness: 3 } },
      { value: 'B', label: 'B', text: '大致清楚', desc: '有方向，还在细化', scores: { readiness: 2 } },
      { value: 'C', label: 'C', text: '只有模糊想法', desc: '知道不想要什么，但还不够具体', scores: { readiness: 1 } },
      { value: 'D', label: 'D', text: '还不清楚', desc: '更多只是想先离开再说', scores: { readiness: 0 } }
    ]
  },
  {
    id: 9,
    category: '方向清晰度',
    title: '为了跳到下一份工作，你最近 4 周实际做了多少准备？',
    options: [
      { value: 'A', label: 'A', text: '已经在行动', desc: '更新简历、投递、约聊或做作品集', scores: { readiness: 3 } },
      { value: 'B', label: 'B', text: '做过一些', desc: '有开始了解和整理信息', scores: { readiness: 2 } },
      { value: 'C', label: 'C', text: '想过但没推进', desc: '还停留在脑内计划', scores: { readiness: 1 } },
      { value: 'D', label: 'D', text: '基本没开始', desc: '还没有实际动作', scores: { readiness: 0 } }
    ]
  },
  {
    id: 10,
    category: '手里有多少底气',
    title: '如果你现在没工资了，手上的钱大概还够你生活多久？',
    options: [
      { value: 'A', label: 'A', text: '1 年以上', desc: '短时间内生活压力不大', scores: { buffer: 3 } },
      { value: 'B', label: 'B', text: '半年到 1 年', desc: '能撑一段时间，但要有计划', scores: { buffer: 2 } },
      { value: 'C', label: 'C', text: '3 到 5 个月', desc: '不算特别紧，但也不能拖太久', scores: { buffer: 1 } },
      { value: 'D', label: 'D', text: '不到 3 个月', desc: '很快就会有现实压力', scores: { buffer: 0 } }
    ]
  },
  {
    id: 11,
    category: '手里有多少底气',
    title: '如果离职 3 个月后还没找到下家，你的现实压力会有多大？',
    options: [
      { value: 'A', label: 'A', text: '压力较小', desc: '我有空间继续找更合适的机会', scores: { buffer: 3 } },
      { value: 'B', label: 'B', text: '有压力但可控', desc: '需要节制，但还能撑住', scores: { buffer: 2 } },
      { value: 'C', label: 'C', text: '压力会很明显', desc: '会影响生活安排和决策质量', scores: { buffer: 1 } },
      { value: 'D', label: 'D', text: '压力会很大', desc: '债务、家庭或生活成本会立刻逼近', scores: { buffer: 0 } }
    ]
  },
  {
    id: 12,
    category: '手里有多少底气',
    title: '除了存款，你还有没有别的东西能撑你一阵子？',
    options: [
      { value: 'A', label: 'A', text: '有好几层保障', desc: '比如补偿金、副业收入、家人支持等', scores: { buffer: 3 } },
      { value: 'B', label: 'B', text: '至少有一层保障', desc: '真离职了也不至于完全没退路', scores: { buffer: 2 } },
      { value: 'C', label: 'C', text: '有一点，但不稳', desc: '能帮一部分，但不太靠得住', scores: { buffer: 1 } },
      { value: 'D', label: 'D', text: '基本没有', desc: '主要还是只能靠自己手上的钱', scores: { buffer: 0 } }
    ]
  },
  {
    id: 13,
    category: '现实事务',
    title: '如果你这个月离职，你知不知道下个月社保、医保和公积金谁来接着交？',
    options: [
      { value: 'A', label: 'A', text: '很清楚', desc: '已经有明确安排，不担心断缴', scores: { practical: 0 } },
      { value: 'B', label: 'B', text: '大致清楚', desc: '知道方向，但还没落实细节', scores: { practical: 1 } },
      { value: 'C', label: 'C', text: '还没想过', desc: '知道会影响，但还没开始准备', scores: { practical: 2 } },
      { value: 'D', label: 'D', text: '完全不清楚', desc: '离职后续缴安排是空白', scores: { practical: 3 } }
    ]
  },
  {
    id: 14,
    category: '现实事务',
    title: '如果你准备走人，预期离职日、年假怎么排、交接给谁、最后一笔工资啥时候到，这些你心里有数吗？',
    options: [
      { value: 'A', label: 'A', text: '很有数', desc: '时间点和交接安排都已经盘过', scores: { practical: 0 } },
      { value: 'B', label: 'B', text: '大致有数', desc: '大方向清楚，还差一些细节', scores: { practical: 1 } },
      { value: 'C', label: 'C', text: '只想过一点', desc: '知道要办，但没排清楚顺序', scores: { practical: 2 } },
      { value: 'D', label: 'D', text: '完全没盘过', desc: '现在就提离职大概率会手忙脚乱', scores: { practical: 3 } }
    ]
  },
  {
    id: 15,
    category: '现实事务',
    title: '离职前那些要留痕、要签字、要备份的事，你准备得怎么样了？',
    options: [
      { value: 'A', label: 'A', text: '准备得差不多了', desc: '知道要留流程截图、交接签字，也会整理材料', scores: { practical: 0 } },
      { value: 'B', label: 'B', text: '已经想过一些', desc: '知道大概要做什么，但还没系统整理', scores: { practical: 1 } },
      { value: 'C', label: 'C', text: '准备很少', desc: '只顾着想离开，还没顾上这些细节', scores: { practical: 2 } },
      { value: 'D', label: 'D', text: '完全没准备', desc: '合同、工资社保记录、交接留痕都没整理', scores: { practical: 3 } }
    ]
  },
  {
    id: 16,
    category: '现实事务',
    title: '你有没有那些最好趁在职先办掉的事，比如体检、处方、信用卡、签证、通行证、居住证续办？',
    options: [
      { value: 'A', label: 'A', text: '基本都盘过了', desc: '该办的事项已经安排得差不多', scores: { practical: 0 } },
      { value: 'B', label: 'B', text: '想过一部分', desc: '有 1-2 项待办，但还来得及', scores: { practical: 1 } },
      { value: 'C', label: 'C', text: '拖着没办', desc: '知道该办，但一直没腾出时间', scores: { practical: 2 } },
      { value: 'D', label: 'D', text: '完全没想过', desc: '大概率会等离职后才想起来补救', scores: { practical: 3 } }
    ]
  },
  {
    id: 17,
    category: '现实事务',
    title: '真离职后这几个月你准备怎么过，自己心里有多清楚？',
    options: [
      { value: 'A', label: 'A', text: '很清楚', desc: '是先休息还是先找下家，我都想过也算过钱', scores: { practical: 0 } },
      { value: 'B', label: 'B', text: '大致清楚', desc: '方向有了，还在补细节', scores: { practical: 1 } },
      { value: 'C', label: 'C', text: '只想过一点', desc: '只知道想离开，还没想清楚离职后的日子', scores: { practical: 2 } },
      { value: 'D', label: 'D', text: '完全没想过', desc: '大概率会走一步看一步', scores: { practical: 3 } }
    ]
  },
  {
    id: 18,
    category: '工作底线',
    title: '这份工作发工资稳不稳？',
    options: [
      { value: 'A', label: 'A', text: '一直稳定', desc: '按时发放，没有明显拖欠', scores: { baseline: 0 } },
      { value: 'B', label: 'B', text: '偶尔延迟', desc: '有波动，但总体还能接受', scores: { baseline: 1 } },
      { value: 'C', label: 'C', text: '经常延迟', desc: '发薪时间不稳定，会影响安排', scores: { baseline: 2 } },
      { value: 'D', label: 'D', text: '已经影响生活', desc: '拖欠或混乱到让我焦虑', scores: { baseline: 3 } }
    ]
  },
  {
    id: 19,
    category: '工作底线',
    title: '公司五险一金交得正不正常？',
    options: [
      { value: 'A', label: 'A', text: '一直正常', desc: '缴纳清晰稳定', scores: { baseline: 0 } },
      { value: 'B', label: 'B', text: '偶尔有问题', desc: '比例、月份或明细上有小波动', scores: { baseline: 1 } },
      { value: 'C', label: 'C', text: '问题较多', desc: '补缴、漏缴或不透明比较常见', scores: { baseline: 2 } },
      { value: 'D', label: 'D', text: '明显不合规', desc: '基本保障本身就让我不安心', scores: { baseline: 3 } }
    ]
  },
  {
    id: 20,
    category: '工作底线',
    title: '你现在每天上班时长，长期来看算不算太离谱？',
    options: [
      { value: 'A', label: 'A', text: '基本合理', desc: '接近正常工作时长', scores: { baseline: 0 } },
      { value: 'B', label: 'B', text: '偶尔偏长', desc: '忙的时候会多一些，但还能恢复', scores: { baseline: 1 } },
      { value: 'C', label: 'C', text: '经常偏长', desc: '长工时已经很常见', scores: { baseline: 2 } },
      { value: 'D', label: 'D', text: '长期超负荷', desc: '时长本身就在吞掉生活', scores: { baseline: 3 } }
    ]
  },
  {
    id: 21,
    category: '工作底线',
    title: '你是不是经常被临时叫去加班，自己的生活根本没法安排？',
    options: [
      { value: 'A', label: 'A', text: '基本不会', desc: '安排相对稳定', scores: { baseline: 0 } },
      { value: 'B', label: 'B', text: '偶尔会有', desc: '临时加班不算太频繁', scores: { baseline: 1 } },
      { value: 'C', label: 'C', text: '比较常见', desc: '经常被工作临时打断', scores: { baseline: 2 } },
      { value: 'D', label: 'D', text: '几乎成常态', desc: '我很难对自己的时间做主', scores: { baseline: 3 } }
    ]
  },
  {
    id: 22,
    category: '工作底线',
    title: '双休、节假日这些最基本的休息，你能正常休到吗？',
    options: [
      { value: 'A', label: 'A', text: '基本正常', desc: '双休和节假日都比较有保障', scores: { baseline: 0 } },
      { value: 'B', label: 'B', text: '偶尔被侵占', desc: '忙的时候会受影响', scores: { baseline: 1 } },
      { value: 'C', label: 'C', text: '经常被侵占', desc: '单双休、节假日经常打折', scores: { baseline: 2 } },
      { value: 'D', label: 'D', text: '长期无法保障', desc: '我几乎没有稳定的休息边界', scores: { baseline: 3 } }
    ]
  },
  {
    id: 23,
    category: '工作底线',
    title: '带薪年假这些假，你真能请下来吗？',
    options: [
      { value: 'A', label: 'A', text: '基本可以', desc: '休假权利能落地', scores: { baseline: 0 } },
      { value: 'B', label: 'B', text: '有时受限', desc: '能请，但过程不太顺畅', scores: { baseline: 1 } },
      { value: 'C', label: 'C', text: '较难落实', desc: '名义上有，实际上很难休', scores: { baseline: 2 } },
      { value: 'D', label: 'D', text: '几乎无法使用', desc: '休假权利基本停留在纸面', scores: { baseline: 3 } }
    ]
  },
  {
    id: 24,
    category: '工作底线',
    title: '你的直属领导会不会长期打压你、羞辱你，或者老是 PUA 你？',
    options: [
      { value: 'A', label: 'A', text: '基本没有', desc: '沟通方式总体尊重', scores: { baseline: 0 } },
      { value: 'B', label: 'B', text: '偶尔会有', desc: '有压力式沟通，但还能消化', scores: { baseline: 1 } },
      { value: 'C', label: 'C', text: '比较明显', desc: '已经常常影响心情和判断', scores: { baseline: 2 } },
      { value: 'D', label: 'D', text: '长期存在', desc: '这已经是持续性的精神消耗', scores: { baseline: 3 } }
    ]
  },
  {
    id: 25,
    category: '工作底线',
    title: '和同事、团队相处这件事，是帮你省力，还是天天在耗你？',
    options: [
      { value: 'A', label: 'A', text: '相处还可以', desc: '合作总体顺畅', scores: { baseline: 0 } },
      { value: 'B', label: 'B', text: '偶尔会消耗', desc: '有摩擦，但还可修复', scores: { baseline: 1 } },
      { value: 'C', label: 'C', text: '比较消耗', desc: '长期协作让我提不起劲', scores: { baseline: 2 } },
      { value: 'D', label: 'D', text: '非常压抑', desc: '人际环境本身就在耗掉我', scores: { baseline: 3 } }
    ]
  },
  {
    id: 26,
    category: '工作底线',
    title: '这份工作的通勤，是不是已经把你每天折腾得很累了？',
    options: [
      { value: 'A', label: 'A', text: '基本可接受', desc: '通勤对生活影响不大', scores: { baseline: 0 } },
      { value: 'B', label: 'B', text: '有一点影响', desc: '偶尔会累，但能承受', scores: { baseline: 1 } },
      { value: 'C', label: 'C', text: '影响比较明显', desc: '通勤已经在吃掉精力', scores: { baseline: 2 } },
      { value: 'D', label: 'D', text: '影响很大', desc: '上下班本身就在进一步透支我', scores: { baseline: 3 } }
    ]
  },
  {
    id: 27,
    category: '工作底线',
    title: '说白了，这份工作还达不达到你心里“最基本能忍”的标准？',
    options: [
      { value: 'A', label: 'A', text: '大致满足', desc: '虽然不完美，但底线还在', scores: { baseline: 0 } },
      { value: 'B', label: 'B', text: '勉强满足', desc: '有些点在消耗我，但还没完全越线', scores: { baseline: 1 } },
      { value: 'C', label: 'C', text: '很多地方不满足', desc: '我已经在反复妥协', scores: { baseline: 2 } },
      { value: 'D', label: 'D', text: '基本不满足', desc: '这份工作已经碰到我的底线', scores: { baseline: 3 } }
    ]
  }
];

const ASSESSMENT_META = {
  questionCount: QUESTION_BANK.length,
  estimatedMinutesText: '约 5-6 分钟',
  storageKey: 'quitAssessmentResult'
};

function getMaxScoreForKey(scoreKey) {
  return QUESTION_BANK.reduce((total, question) => {
    const maxOptionScore = question.options.reduce((maxScore, option) => {
      const nextScore = option.scores && typeof option.scores[scoreKey] === 'number'
        ? option.scores[scoreKey]
        : 0;
      return Math.max(maxScore, nextScore);
    }, 0);

    return total + maxOptionScore;
  }, 0);
}

module.exports = {
  QUESTION_BANK,
  SCORE_KEYS,
  ASSESSMENT_META,
  getMaxScoreForKey
};
