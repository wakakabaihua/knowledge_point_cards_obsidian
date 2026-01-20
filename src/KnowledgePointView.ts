import { ItemView, WorkspaceLeaf, Notice, MarkdownRenderer, Component } from 'obsidian';
import { KnowledgeCardAPI } from './api';
import { CardMappingManager } from './CardMappingManager';
import { CardResponse, KnowledgePoint, Question, BlankInfo } from './types';

export const KNOWLEDGE_POINT_VIEW_TYPE = 'knowledge-point-view';

/**
 * 知识点查看视图
 */
export class KnowledgePointView extends ItemView {
	private api: KnowledgeCardAPI;
	private mappingManager: CardMappingManager;
	private currentCards: CardResponse[] = [];
	private currentCardIndex = 0;
	private viewContentEl: HTMLElement;
	private component: Component;

	constructor(
		leaf: WorkspaceLeaf,
		api: KnowledgeCardAPI,
		mappingManager: CardMappingManager
	) {
		super(leaf);
		this.api = api;
		this.mappingManager = mappingManager;
		this.component = new Component();
	}

	getViewType(): string {
		return KNOWLEDGE_POINT_VIEW_TYPE;
	}

	getDisplayText(): string {
		return '知识点查看器';
	}

	getIcon(): string {
		return 'book-open';
	}

	async onOpen() {
		const container = this.containerEl.children[1];
		container.empty();
		container.addClass('knowledge-point-view-container');

		this.viewContentEl = container.createDiv('knowledge-point-content');

		// 加载已同步的卡片
		await this.loadSyncedCards();

		// 显示界面
		this.render();
	}

	async onClose(): Promise<void> {
		this.component.unload();
		this.viewContentEl.empty();
	}

	/**
	 * 加载所有已同步的卡片
	 */
	private async loadSyncedCards(): Promise<void> {
		try {
			const mappings = this.mappingManager.getAllMappings();
			
			if (mappings.length === 0) {
				this.currentCards = [];
				return;
			}
			
			// 批量获取卡片详情
			this.currentCards = [];
			for (const mapping of mappings) {
				try {
					const card = await this.getCardDetail(mapping.cardId);
					if (card) {
						this.currentCards.push(card);
					}
				} catch {
					// Silent fail for individual card loading
				}
			}
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : String(err);
			new Notice('加载卡片失败: ' + errorMessage);
		}
	}

	/**
	 * 获取卡片详情
	 */
	private async getCardDetail(cardId: string): Promise<CardResponse | null> {
		try {
			const cardResponse = await this.api['request'](`/api/v1/cards/${cardId}`, 'GET');
			
			if (cardResponse.status !== 200) {
				return null;
			}

			const card = cardResponse.json;

			// 使用专门的API获取知识点
			const kpResponse = await this.api['request'](
				`/api/v1/knowledge-points?card_ids=${cardId}`, 
				'GET'
			);
			
			if (kpResponse.status === 200 && kpResponse.json) {
				card.knowledge_points = kpResponse.json.knowledge_points || [];
			} else {
				card.knowledge_points = [];
			}

			return card;
		} catch {
			return null;
		}
	}

	/**
	 * 获取卡片的所有题目
	 */
	private async getQuestionsForKnowledgePoint(kpId: string): Promise<Question[]> {
		try {
			const response = await this.api['request'](
				`/api/v1/knowledge-points/${kpId}/questions`,
				'GET'
			);
			
			if (response.status !== 200) {
				return [];
			}

			return response.json || [];
		} catch {
			return [];
		}
	}

	/**
	 * 渲染界面
	 */
	private render() {
		this.viewContentEl.empty();

		if (this.currentCards.length === 0) {
			this.renderEmptyState();
			return;
		}

		// 渲染卡片切换器
		this.renderCardSwitcher();

		// 渲染当前卡片的知识点
		this.renderKnowledgePoints();
	}

	/**
	 * 渲染空状态
	 */
	private renderEmptyState() {
		const emptyDiv = this.viewContentEl.createDiv('empty-state');
		emptyDiv.createEl('div', { 
			text: '📚',
			cls: 'empty-icon'
		});
		emptyDiv.createEl('h3', { text: '暂无知识卡片' });
		emptyDiv.createEl('p', { 
			text: '请先同步一些文档到知识卡片系统',
			cls: 'empty-hint'
		});
	}

	/**
	 * 渲染卡片切换器
	 */
	private renderCardSwitcher() {
		const switcherContainer = this.viewContentEl.createDiv('card-switcher');

		// 左箭头
		const prevBtn = switcherContainer.createEl('button', { 
			text: '←',
			cls: 'nav-button'
		});
		prevBtn.addEventListener('click', () => {
			if (this.currentCardIndex > 0) {
				this.currentCardIndex--;
				this.render();
			}
		});
		prevBtn.disabled = this.currentCardIndex === 0;

		// 卡片信息
		const currentCard = this.currentCards[this.currentCardIndex];
		const cardInfo = switcherContainer.createDiv('card-info');
		
		cardInfo.createEl('div', { 
			text: currentCard.title || '未命名卡片',
			cls: 'card-title'
		});
		
		const metaEl = cardInfo.createDiv('card-meta');
		metaEl.createEl('span', { 
			text: `${this.currentCardIndex + 1} / ${this.currentCards.length}`,
			cls: 'card-index'
		});
		metaEl.createEl('span', { 
			text: `难度: ${currentCard.difficulty || 3}`,
			cls: 'card-difficulty'
		});
		
		if (currentCard.tags && currentCard.tags.length > 0) {
			const tagsEl = metaEl.createEl('span', { cls: 'card-tags' });
			currentCard.tags.forEach(tag => {
				tagsEl.createEl('span', { text: tag, cls: 'tag' });
			});
		}

		// 右箭头
		const nextBtn = switcherContainer.createEl('button', { 
			text: '→',
			cls: 'nav-button'
		});
		nextBtn.addEventListener('click', () => {
			if (this.currentCardIndex < this.currentCards.length - 1) {
				this.currentCardIndex++;
				this.render();
			}
		});
		nextBtn.disabled = this.currentCardIndex === this.currentCards.length - 1;

		// 刷新按钮
		const refreshBtn = switcherContainer.createEl('button', { 
			text: '🔄',
			cls: 'refresh-button',
			attr: { title: '刷新卡片列表' }
		});
		refreshBtn.addEventListener('click', async () => {
			new Notice('正在刷新...');
			await this.loadSyncedCards();
			this.currentCardIndex = 0;
			this.render();
			new Notice('刷新完成');
		});
	}

	/**
	 * 渲染知识点列表
	 */
	private async renderKnowledgePoints() {
		const currentCard = this.currentCards[this.currentCardIndex];
		
		const kpContainer = this.viewContentEl.createDiv('knowledge-points-container');

		// 卡片摘要
		if (currentCard.summary) {
			const summaryDiv = kpContainer.createDiv('card-summary');
			summaryDiv.createEl('h3', { text: '📝 卡片摘要' });
			summaryDiv.createEl('p', { text: currentCard.summary });
		}

		// 知识点列表
		const kpListDiv = kpContainer.createDiv('knowledge-points-list');
		kpListDiv.createEl('h3', { 
			text: `💡 知识点 (${currentCard.knowledge_points?.length || 0})`
		});

		if (!currentCard.knowledge_points || currentCard.knowledge_points.length === 0) {
			const emptyDiv = kpListDiv.createDiv('empty-state');
			emptyDiv.createEl('p', { 
				text: '暂无知识点',
				cls: 'empty-hint'
			});
			emptyDiv.createEl('p', { 
				text: '💡 如果刚刚创建卡片，知识点可能正在后台生成中，请稍后点击刷新按钮 🔄',
				cls: 'empty-hint-sub'
			});
			return;
		}

		// 渲染每个知识点
		for (const kp of currentCard.knowledge_points) {
			await this.renderKnowledgePoint(kpListDiv, kp);
		}
	}

	/**
	 * 渲染单个知识点
	 */
	private async renderKnowledgePoint(container: HTMLElement, kp: KnowledgePoint): Promise<void> {
		const kpDiv = container.createDiv('knowledge-point-item');

		// 知识点标题行
		const headerDiv = kpDiv.createDiv('knowledge-point-header');
		
		// 标题
		headerDiv.createEl('h4', { 
			text: kp.text || '未命名知识点',
			cls: 'knowledge-point-title'
		});
		
		// 右侧标签区域
		const badgesDiv = headerDiv.createDiv('kp-badges');
		
		// 知识点类型
		if (kp.type) {
			badgesDiv.createEl('span', { 
				cls: 'kp-type-badge',
				text: kp.type
			});
		}
		
		// 权重标签
		const weight = kp.weight || 0;
		const weightBadge = badgesDiv.createEl('span', { 
			cls: 'knowledge-point-weight',
			text: `权重: ${weight}`
		});
		
		// 根据权重添加不同样式
		if (weight >= 8) {
			weightBadge.addClass('weight-high');
		} else if (weight >= 5) {
			weightBadge.addClass('weight-medium');
		} else {
			weightBadge.addClass('weight-low');
		}

		// 知识点内容（支持Markdown渲染）
		const contentDiv = kpDiv.createDiv('knowledge-point-content');
		
		// 显示简短说明
		if (kp.short_explanation) {
			const shortExpDiv = contentDiv.createDiv('knowledge-point-short-explanation');
			shortExpDiv.createEl('strong', { text: '概述：' });
			shortExpDiv.createSpan({ text: kp.short_explanation });
		}
		
		// 显示详细说明（支持Markdown）
		if (kp.detailed_explanation) {
			const detailExpDiv = contentDiv.createDiv('knowledge-point-detailed-explanation');
			try {
				// 使用Obsidian的Markdown渲染器
				await MarkdownRenderer.render(
					this.app,
					kp.detailed_explanation,
					detailExpDiv,
					'',
					this.component
				);
			} catch {
				// 如果Markdown渲染失败，尝试简单的文本显示
				detailExpDiv.empty();
				const textLines = kp.detailed_explanation.split('\n');
				textLines.forEach(line => {
					if (line.trim()) {
						detailExpDiv.createEl('p', { text: line });
					}
				});
			}
		}
		
		// 如果两者都没有，显示提示
		if (!kp.short_explanation && !kp.detailed_explanation) {
			contentDiv.createEl('p', { 
				text: '暂无内容', 
				cls: 'empty-hint' 
			});
		}

		// 获取并显示该知识点的题目（可折叠）
		const questionKpId = kp.id || kp.knowledge_point_id || '';
		const questions = questionKpId ? await this.getQuestionsForKnowledgePoint(questionKpId) : [];
		
		if (questions.length > 0) {
			this.renderQuestionsCollapsible(kpDiv, questions);
		}
	}

	/**
	 * 渲染可折叠的题目列表
	 */
	private renderQuestionsCollapsible(container: HTMLElement, questions: Question[]): void {
		if (!questions || questions.length === 0) {
			return;
		}

		const questionsDiv = container.createDiv('questions-section');
		
		// 题目区域标题（可点击折叠）
		const questionsHeader = questionsDiv.createDiv('questions-header');
		questionsHeader.addClass('collapsible-header');
		
		const toggleIcon = questionsHeader.createSpan('toggle-icon');
		toggleIcon.setText('▶'); // 默认折叠状态
		
		questionsHeader.createEl('h5', { 
			text: `📋 相关题目 (${questions.length})`,
			cls: 'questions-title-inline'
		});

		const questionsList = questionsDiv.createDiv('questions-list');
		questionsList.addClass('collapsible-content');
		questionsList.addClass('kc-hidden');
		
		// 默认折叠
		let isExpanded = false;
		
		questionsHeader.addEventListener('click', () => {
			isExpanded = !isExpanded;
			if (isExpanded) {
				questionsList.removeClass('kc-hidden');
				toggleIcon.setText('▼');
			} else {
				questionsList.addClass('kc-hidden');
				toggleIcon.setText('▶');
			}
		});
		
		questions.forEach((q: Question, index: number) => {
			const qDiv = questionsList.createDiv('question-item');
			
			// 题目编号和类型
			const qHeader = qDiv.createDiv('question-header');
			qHeader.createEl('span', { 
				text: `${index + 1}.`,
				cls: 'question-number'
			});
			
			const questionType = q.question_type || 'multiple_choice';
			qHeader.createEl('span', { 
				cls: `question-type-badge type-${questionType}`,
				text: this.getQuestionTypeText(questionType)
			});

			// 题目内容
			const qContent = qDiv.createDiv('question-content');
			
			// 根据题目类型渲染不同的内容
			switch (questionType) {
				case 'true_false':
					this.renderTrueFalseQuestion(qContent, q);
					break;
				case 'multiple_select':
					this.renderMultipleSelectQuestion(qContent, q);
					break;
				case 'word_bank':
					this.renderWordBankQuestion(qContent, q);
					break;
				case 'multiple_choice':
				default:
					this.renderMultipleChoiceQuestion(qContent, q);
					break;
			}

			// 正确答案和解析（折叠显示）
			const answerToggle = qDiv.createEl('button', { 
				text: '▼ 查看答案',
				cls: 'answer-toggle'
			});
			
			const answerDiv = qDiv.createDiv('answer-section kc-hidden');
			
			// 根据题目类型渲染正确答案
			this.renderCorrectAnswer(answerDiv, q, questionType);
			
			// 解析
			if (q.explanation) {
				const explanationDiv = answerDiv.createDiv('explanation');
				explanationDiv.createEl('strong', { text: '💡 解析：' });
				explanationDiv.createEl('p', { text: q.explanation });
			}

			// 折叠按钮事件
			let answerExpanded = false;
			answerToggle.addEventListener('click', () => {
				answerExpanded = !answerExpanded;
				if (answerExpanded) {
					answerDiv.removeClass('kc-hidden');
					answerToggle.setText('▲ 隐藏答案');
				} else {
					answerDiv.addClass('kc-hidden');
					answerToggle.setText('▼ 查看答案');
				}
			});
		});
	}

	/**
	 * 渲染单选题
	 */
	private renderMultipleChoiceQuestion(container: HTMLElement, q: Question): void {
		container.createEl('p', { text: q.question_text });
		
		if (q.options && q.options.length > 0) {
			const optionsDiv = container.createDiv('question-options');
			q.options.forEach((opt: string, i: number) => {
				const optionLabel = String.fromCharCode(65 + i);
				const optEl = optionsDiv.createEl('div', { cls: 'option-item' });
				
				const isCorrect = q.correct_answer_index === i;
				if (isCorrect) {
					optEl.addClass('correct-answer');
					optEl.addClass('kc-option-correct');
					optEl.createEl('strong', { text: `${optionLabel}. ${opt}` });
					optEl.createEl('span', { 
						text: '✓ 正确答案',
						cls: 'kc-correct-mark'
					});
				} else {
					optEl.addClass('kc-option-normal');
					optEl.setText(`${optionLabel}. ${opt}`);
				}
			});
		}
	}

	/**
	 * 渲染多选题
	 */
	private renderMultipleSelectQuestion(container: HTMLElement, q: Question): void {
		container.createEl('p', { text: q.question_text });
		
		// 添加多选提示
		container.createEl('span', { 
			text: '（多选题，可选择多个答案）',
			cls: 'multi-select-hint'
		});
		
		if (q.options && q.options.length > 0) {
			const optionsDiv = container.createDiv('question-options multi-select-options');
			const correctAnswers = q.correct_answers || [];
			
			q.options.forEach((opt: string, i: number) => {
				const optionLabel = String.fromCharCode(65 + i);
				const optEl = optionsDiv.createEl('div', { cls: 'option-item checkbox-style kc-option-item' });
				
				const isCorrect = correctAnswers.includes(i);
				const checkbox = isCorrect ? '☑' : '☐';
				
				if (isCorrect) {
					optEl.addClass('correct-answer');
					optEl.addClass('kc-option-correct');
					optEl.createEl('span', { text: checkbox, cls: 'checkbox' });
					optEl.createEl('strong', { text: ` ${optionLabel}. ${opt}` });
					optEl.createEl('span', { text: ' ✓', cls: 'kc-correct-mark' });
				} else {
					optEl.createEl('span', { text: checkbox, cls: 'checkbox' });
					optEl.createSpan({ text: ` ${optionLabel}. ${opt}` });
				}
			});
		}
	}

	/**
	 * 渲染判断题
	 */
	private renderTrueFalseQuestion(container: HTMLElement, q: Question): void {
		container.createEl('p', { text: q.question_text });
		
		const optionsDiv = container.createDiv('question-options true-false-options');
		
		const correctAnswer = q.correct_answer;
		
		// 正确选项
		const trueEl = optionsDiv.createEl('div', { cls: 'option-item true-false-item kc-tf-option' });
		if (correctAnswer === true) {
			trueEl.addClass('correct-answer');
			trueEl.addClass('kc-option-correct');
			trueEl.createEl('span', { text: '✓', cls: 'tf-icon' });
			trueEl.createEl('strong', { text: ' 正确' });
			trueEl.createEl('span', { text: ' ← 正确答案', cls: 'kc-correct-mark' });
		} else {
			trueEl.createEl('span', { text: '✓', cls: 'tf-icon' });
			trueEl.createSpan({ text: ' 正确' });
		}
		
		// 错误选项
		const falseEl = optionsDiv.createEl('div', { cls: 'option-item true-false-item kc-tf-option' });
		if (correctAnswer === false) {
			falseEl.addClass('correct-answer');
			falseEl.addClass('kc-option-correct');
			falseEl.createEl('span', { text: '✗', cls: 'tf-icon' });
			falseEl.createEl('strong', { text: ' 错误' });
			falseEl.createEl('span', { text: ' ← 正确答案', cls: 'kc-correct-mark' });
		} else {
			falseEl.createEl('span', { text: '✗', cls: 'tf-icon' });
			falseEl.createSpan({ text: ' 错误' });
		}
	}

	/**
	 * 渲染选词填空题
	 */
	private renderWordBankQuestion(container: HTMLElement, q: Question): void {
		// 渲染带空位的句子
		const sentenceDiv = container.createDiv('word-bank-sentence');
		
		// 解析题目文本中的空位 (格式: ___1___, ___2___ 或 {{blank}})
		const questionText = q.question_text || '';
		const blanks = q.blanks || [];
		const wordBank = q.word_bank || [];
		
		// 显示原始题目文本
		sentenceDiv.createEl('p', { text: questionText });
		
		// 显示词库
		if (wordBank.length > 0) {
			const wordBankDiv = container.createDiv('word-bank-container');
			wordBankDiv.createEl('strong', { text: '📝 词库：' });
			
			const wordsDiv = wordBankDiv.createDiv('word-bank-words');
			wordBank.forEach((word: string) => {
				const wordEl = wordsDiv.createEl('span', { 
					text: word,
					cls: 'word-bank-item'
				});
				
				// 检查是否为正确答案中的词
				const isAnswer = blanks.some((b: BlankInfo) => b.answer === word);
				if (isAnswer) {
					wordEl.addClass('correct-word');
					wordEl.addClass('kc-word-correct');
				}
			});
		}
		
		// 显示正确答案
		if (blanks.length > 0) {
			const answersDiv = container.createDiv('word-bank-answers');
			answersDiv.createEl('strong', { text: '✓ 正确填入：' });
			blanks.forEach((blank: BlankInfo, idx: number) => {
				answersDiv.createEl('span', { 
					text: `第${idx + 1}空: ${blank.answer}`,
					cls: 'blank-answer'
				});
			});
		}
	}

	/**
	 * 渲染正确答案区域
	 */
	private renderCorrectAnswer(container: HTMLElement, q: Question, questionType: string): void {
		const correctAnswerDiv = container.createDiv('correct-answer-section');
		correctAnswerDiv.createEl('strong', { 
			text: '✓ 正确答案: ',
			cls: 'answer-label'
		});
		
		let correctAnswerText = '未设置';
		
		switch (questionType) {
			case 'true_false':
				correctAnswerText = q.correct_answer === true ? '正确 ✓' : '错误 ✗';
				break;
				
			case 'multiple_select': {
				const correctIndices = q.correct_answers || [];
				if (correctIndices.length > 0 && q.options) {
					const answers = correctIndices.map((idx: number) => {
						const letter = String.fromCharCode(65 + idx);
						return `${letter}. ${q.options[idx] || ''}`;
					});
					correctAnswerText = answers.join('、');
				}
				break;
			}
				
			case 'word_bank': {
				const blanks = q.blanks || [];
				if (blanks.length > 0) {
					correctAnswerText = blanks.map((b: BlankInfo, idx: number) => 
						`第${idx + 1}空: ${b.answer}`
					).join('；');
				}
				break;
			}
				
			case 'multiple_choice':
			default:
				if (q.correct_answer_index !== undefined && q.correct_answer_index >= 0) {
					const answerLetter = String.fromCharCode(65 + q.correct_answer_index);
					const answerOption = q.options?.[q.correct_answer_index];
					correctAnswerText = answerOption 
						? `${answerLetter}. ${answerOption}` 
						: answerLetter;
				}
				break;
		}
		
		correctAnswerDiv.createEl('span', { 
			text: correctAnswerText,
			cls: 'answer-value'
		});
	}

	/**
	 * 获取题目类型文本
	 */
	private getQuestionTypeText(type: string): string {
		const typeMap: Record<string, string> = {
			'multiple_choice': '单选题',
			'multiple_select': '多选题',
			'fill_blank': '填空题',
			'true_false': '判断题',
			'word_bank': '选词填空',
			'short_answer': '简答题'
		};
		return typeMap[type] || type || '选择题';
	}

	/**
	 * 刷新视图
	 */
	async refresh() {
		await this.loadSyncedCards();
		this.render();
	}
}
