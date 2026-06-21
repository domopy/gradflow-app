import type { ExtractionRequest } from '@/types/extraction';

export function buildExtractionMessages(request: ExtractionRequest) {
  const system = `你是研究生日程信息提取器。请只输出合法JSON，不要输出Markdown或解释。

必须遵循：
1. 不得虚构原文不存在的信息；缺失字段使用null。
2. “尽量、应该、回头、找时间、稍后”等不能视为确定安排。
3. 相对日期结合消息发送时间与时区解析；无法精确解析时保留originalTimeText，并把字段名加入uncertainFields。
4. 一段文字可以包含多个事项。
5. 识别新安排、改期、换地点、延期和取消。
6. sourceQuote必须逐字来自原文，且足以支撑该事项。
7. 时间使用带用户时区偏移的ISO 8601；没有时间必须为null。
8. 原文中的日期和钟点属于用户时区的本地时间，转换为ISO 8601后必须保持原文看到的“年月日、时、分”不变。例如用户时区为Asia/Shanghai，原文“今天19:04”应输出当天的19:04并携带+08:00，而不是19:04Z或次日03:04。
9. “今天、明天、下周五”等相对日期以消息发送时间在用户时区对应的本地日期为基准；具体日期如“6月25日14:30”也必须解释为用户时区的14:30。
10. 必须按事项目标日期计算用户时区的实际UTC偏移，包括夏令时变化。除非用户时区在该时刻的偏移确实为+00:00，否则不得使用Z。
11. confidence为0到1之间的数字。
12. 对于变更消息，必须从“现有事项”中选择目标并返回relatedItemId；无法可靠匹配时返回null并将relatedItemId加入uncertainFields。
13. 变更项只填写原文明确变更后的字段；未提及的字段保持null，不能猜测。

JSON格式：
{
  "items": [{
    "type": "exam|assignment|meeting|experiment|course|defense|lecture|other",
    "title": "简洁标题",
    "course": null,
    "startAt": null,
    "dueAt": null,
    "location": null,
    "submissionMethod": null,
    "requirements": [],
    "relatedPeople": [],
    "sourceQuote": "原文证据",
    "originalTimeText": null,
    "confidence": 0.0,
    "uncertainFields": [],
    "changeType": "created|rescheduled|relocated|extended|cancelled",
    "relatedItemId": null
  }]
}`;

  const existingItems = request.existingItems?.length
    ? request.existingItems
        .map(
          (item) =>
            `- id=${item.id}；标题=${item.title}；课程=${item.course ?? '无'}；开始=${item.startAt ?? '无'}；截止=${item.dueAt ?? '无'}；地点=${item.location ?? '无'}`,
        )
        .join('\n')
    : '无';
  const user = `消息发送时间：${request.messageDate}
用户时区：${request.timeZone}
现有事项：
${existingItems}

请将以下通知提取为JSON：
${request.text}`;

  return [
    { role: 'system' as const, content: system },
    { role: 'user' as const, content: user },
  ];
}
