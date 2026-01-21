import { requestUrl, RequestUrlResponse } from 'obsidian';
import { KnowledgeCardSettings, CardResponse, GenerateResponse } from './types';

export class KnowledgeCardAPI {
	private settings: KnowledgeCardSettings;

	constructor(settings: KnowledgeCardSettings) {
		this.settings = settings;
	}

	updateSettings(settings: KnowledgeCardSettings) {
		this.settings = settings;
	}

	private getHeaders(): Record<string, string> {
		return {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${this.settings.apiToken}`
		};
	}

	private async request(
		endpoint: string, 
		method = 'GET', 
		body?: Record<string, unknown>,
		timeout?: number // 自定义超时时间（毫秒）
	): Promise<RequestUrlResponse> {
		const url = `${this.settings.apiBaseUrl}${endpoint}`;
		
		// Debug mode logging
		if (this.settings.debugMode) {
			console.debug(`[KC API] ${method} ${url}`);
			if (body) {
				console.debug(`[KC API] Body:`, body);
			}
		}

		const startTime = Date.now();

		try {
			const requestConfig = {
				url,
				method,
				headers: this.getHeaders(),
				body: body ? JSON.stringify(body) : undefined,
				throw: false,
				...(timeout && { timeout })
			};
			
			const response = await requestUrl(requestConfig);
			const duration = Date.now() - startTime;

			if (this.settings.debugMode) {
				console.debug(`[KC API] Response: ${response.status} (${duration}ms)`);
			}

			// Log errors regardless of debug mode
			if (response.status >= 400 && response.status < 500) {
				console.warn(`[KC API] Client error: ${response.status}`, response.json || response.text);
			} else if (response.status >= 500) {
				console.error(`[KC API] Server error: ${response.status}`, response.json || response.text);
			}

			return response;
		} catch (error) {
			console.error(`[KC API] Request failed: ${error.message}`);
			throw error;
		}
	}

	/**
	 * 验证Token是否有效
	 */
	async validateToken(): Promise<boolean> {
		try {
			const response = await this.request('/api/users/me', 'GET');
			return response.status === 200;
		} catch (_e) {
			return false;
		}
	}

	/**
	 * 检查卡片创建配额
	 */
	async checkCardQuota(): Promise<{allowed: boolean; current_usage: number; limit: number; remaining: number; message?: string}> {
		try {
			const response = await this.request('/api/v1/membership/check-quota/card_limit', 'GET');
			
			if (response.status !== 200) {
				// 检查失败时返回允许（降级策略）
				return { allowed: true, current_usage: 0, limit: -1, remaining: -1 };
			}
			
			const data = response.json;
			return {
				allowed: data.allowed !== false,
				current_usage: data.current_usage || 0,
				limit: data.limit || -1,
				remaining: data.remaining || -1,
				message: data.allowed === false ? `卡片数量已达上限（${data.limit}张），已创建 ${data.current_usage} 张。请升级会员解锁更多。` : undefined
			};
		} catch (error) {
			// 检查失败时返回允许（降级策略）
			console.error('[KC API] 配额检查失败:', error);
			return { allowed: true, current_usage: 0, limit: -1, remaining: -1 };
		}
	}

	/**
	 * 创建知识卡片
	 */
	async createCard(
		content: string, 
		title?: string, 
		tags?: string[]
	): Promise<CardResponse> {
		// 先检查配额
		const quotaCheck = await this.checkCardQuota();
		if (!quotaCheck.allowed) {
			throw new Error(quotaCheck.message || '卡片数量已达上限，请升级会员');
		}
		
		const response = await this.request('/api/v1/cards', 'POST', {
			content_md: content,
			title: title || '未命名卡片',
			tags: tags || this.settings.defaultTags,
			difficulty: 3,
			source: 'obsidian'
		}, 300000);

		if (response.status === 403) {
			// 处理后端返回的配额超限错误
			const detail = response.json?.detail;
			if (detail?.error === 'quota_exceeded') {
				throw new Error(detail.message || '卡片数量已达上限，请升级会员');
			}
		}

		if (response.status !== 201) {
			throw new Error(`创建卡片失败: ${response.status}`);
		}

		return response.json;
	}

	/**
	 * 为卡片生成知识点和问题（异步模式，不等待结果）
	 * 触发后台生成，立即返回，生成完成后用户可通过刷新查看
	 */
	async generateKnowledgePointsAsync(cardId: string): Promise<void> {
		// 使用较短的超时，只是触发任务
		await this.request(
			`/api/v1/cards/${cardId}/generate-content`, 
			'POST',
			undefined,
			10000
		).catch(() => {
			// 即使请求超时也认为任务已触发
			return null;
		});
	}

	/**
	 * 为卡片生成知识点和问题（同步模式，等待结果 - 已废弃，建议使用异步模式）
	 * @deprecated 建议使用 generateKnowledgePointsAsync
	 */
	async generateKnowledgePoints(cardId: string): Promise<CardResponse> {
		const response = await this.request(
			`/api/v1/cards/${cardId}/generate-content`, 
			'POST',
			undefined,
			300000
		);

		if (response.status !== 200) {
			throw new Error(`生成知识点失败: ${response.status}`);
		}
		
		return response.json;
	}

	/**
	 * 获取卡片列表
	 */
	async getCards(): Promise<CardResponse[]> {
		const response = await this.request('/api/v1/cards?page=1&limit=20', 'GET');

		if (response.status !== 200) {
			throw new Error(`获取卡片列表失败: ${response.status}`);
		}

		// 后端返回的是分页数据，需要取出items
		return response.json.items || [];
	}

	/**
	 * 搜索卡片
	 */
	async searchCards(keyword: string, tags?: string): Promise<CardResponse[]> {
		const params = new URLSearchParams();
		params.append('page', '1');
		params.append('limit', '20');
		if (keyword) params.append('search', keyword);
		if (tags) params.append('tags', tags);

		const response = await this.request(
			`/api/v1/cards?${params.toString()}`, 
			'GET'
		);

		if (response.status !== 200) {
			throw new Error(`搜索卡片失败: ${response.status}`);
		}

		// 后端返回的是分页数据，需要取出items
		return response.json.items || [];
	}

	/**
	 * 删除卡片
	 */
	async deleteCard(cardId: string): Promise<boolean> {
		const response = await this.request(
			`/api/v1/cards/${cardId}`,
			'DELETE'
		);

		if (response.status !== 204 && response.status !== 200) {
			throw new Error(`删除卡片失败: ${response.status}`);
		}

		return true;
	}

	/**
	 * 完整流程：创建卡片并触发知识点生成（异步模式）
	 * 卡片创建后立即返回，知识点在后台生成
	 */
	async createCardWithKnowledge(
		content: string,
		title?: string,
		tags?: string[]
	): Promise<GenerateResponse> {
		try {
			// 1. 创建卡片
			const card = await this.createCard(content, title, tags);
			
			// 2. 异步触发知识点生成（不等待完成）
			if (this.settings.generateKnowledgePoints) {
				this.generateKnowledgePointsAsync(card.card_id).catch(() => {
					// Silent fail for background task
				});
				
				return {
					success: true,
					message: '卡片创建成功！知识点正在后台生成中，稍后可刷新查看。',
					card: card
				};
			}
			
			return {
				success: true,
				message: '卡片创建成功',
				card
			};
		} catch (error) {
			return {
				success: false,
				message: '操作失败',
				error: error.message
			};
		}
	}
}
