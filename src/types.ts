/*
 * @Author: workfortomorrow 1324937864@qq.com
 * @Date: 2025-12-15 15:58:40
 * @LastEditors: workfortomorrow 1324937864@qq.com
 * @LastEditTime: 2025-12-17 23:08:47
 * @FilePath: /知识卡片/obsidian-knowledge-card-plugin/src/types.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
export interface KnowledgeCardSettings {
	// 后端API配置
	apiBaseUrl: string;
	apiToken: string;
	
	// 用户配置
	autoSync: boolean;
	defaultTags: string[];
	
	// 生成配置
	generateKnowledgePoints: boolean;
	generateQuestions: boolean;
	
	// 调试
	debugMode: boolean;
}

export const DEFAULT_SETTINGS: KnowledgeCardSettings = {
	apiBaseUrl: 'https://www.xiaoxiaodu.cn',
	apiToken: '',
	autoSync: false,
	defaultTags: [],
	generateKnowledgePoints: true,
	generateQuestions: true,
	debugMode: false
}

export interface FileInfo {
	path: string;
	name: string;
	content: string;
	selected: boolean;
}

export interface CardResponse {
	card_id: string;
	title: string;
	summary?: string;
	content_md?: string;
	tags: string[];
	difficulty: number;
	has_formula?: boolean;
	has_code?: boolean;
	update_time: string;
	content_image_url?: string;
	knowledge_points?: KnowledgePoint[];
}

export interface KnowledgePoint {
	// 后端返回 id，但保留 knowledge_point_id 作为兼容
	id?: string;
	knowledge_point_id?: string;
	text: string;  // 知识点标题
	short_explanation: string;  // 简短说明
	detailed_explanation: string;  // 详细说明
	weight?: number;
	card_id: string;
	type?: string;
	questions?: Question[];  // 添加问题列表
	questions_count?: number;  // 问题数量
}

// 题目类型枚举
export type QuestionType = 'multiple_choice' | 'multiple_select' | 'true_false' | 'word_bank' | 'fill_blank' | 'short_answer';

// 填空题中的空位信息
export interface BlankInfo {
	index: number;           // 空位索引
	answer: string;          // 正确答案
	position?: number;       // 在句子中的位置
}

export interface Question {
	question_id: string;
	card_id: string;
	knowledge_point_id: string;
	question_text: string;
	question_type?: QuestionType;  // 题目类型
	
	// 选择题相关
	options: string[];
	correct_answer_index: number;  // 单选题正确答案索引
	correct_answers?: number[];     // 多选题正确答案索引列表
	
	// 判断题相关
	correct_answer?: boolean;       // 判断题正确答案（true/false）
	
	// 选词填空相关
	blanks?: BlankInfo[];           // 空位信息列表
	word_bank?: string[];           // 词库（可选词汇）
	
	explanation: string;
	difficulty: string;
}

export interface GenerateResponse {
	success: boolean;
	message: string;
	card?: CardResponse;
	error?: string;
}
