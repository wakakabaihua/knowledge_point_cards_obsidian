import { Plugin, TFile } from 'obsidian';

/**
 * 文件和卡片ID的映射关系
 */
interface FileCardMapping {
	filePath: string;
	cardId: string;
	lastSync: string; // ISO时间戳
	title: string;
}

/**
 * 映射关系存储数据结构
 */
interface MappingData {
	version: number;
	mappings: Record<string, FileCardMapping>; // key是文件路径
}

/**
 * 管理Markdown文件和知识卡片ID的映射关系
 */
export class CardMappingManager {
	private plugin: Plugin;
	private mappings: Map<string, FileCardMapping>;
	private readonly STORAGE_KEY = 'card-mappings';

	constructor(plugin: Plugin) {
		this.plugin = plugin;
		this.mappings = new Map();
	}

	/**
	 * 加载映射关系
	 */
	async load(): Promise<void> {
		try {
			const data = await this.plugin.loadData() as MappingData;
			if (data && data.mappings) {
				this.mappings = new Map(Object.entries(data.mappings));
			}
		} catch (error) {
			this.mappings = new Map();
		}
	}

	/**
	 * 保存映射关系
	 */
	async save(): Promise<void> {
		try {
			const data: MappingData = {
				version: 1,
				mappings: Object.fromEntries(this.mappings)
			};
			await this.plugin.saveData(data);
		} catch (error) {
			// Silent fail
		}
	}

	/**
	 * 获取文件对应的卡片ID
	 */
	getCardId(filePath: string): string | null {
		const mapping = this.mappings.get(filePath);
		return mapping ? mapping.cardId : null;
	}

	/**
	 * 获取完整的映射信息
	 */
	getMapping(filePath: string): FileCardMapping | null {
		return this.mappings.get(filePath) || null;
	}

	/**
	 * 检查文件是否已同步过
	 */
	hasMapping(filePath: string): boolean {
		return this.mappings.has(filePath);
	}

	/**
	 * 添加或更新映射关系
	 */
	async setMapping(filePath: string, cardId: string, title: string): Promise<void> {
		const mapping: FileCardMapping = {
			filePath,
			cardId,
			lastSync: new Date().toISOString(),
			title
		};
		this.mappings.set(filePath, mapping);
		await this.save();
	}

	/**
	 * 删除映射关系
	 */
	async removeMapping(filePath: string): Promise<void> {
		this.mappings.delete(filePath);
		await this.save();
	}

	/**
	 * 获取所有映射关系
	 */
	getAllMappings(): FileCardMapping[] {
		return Array.from(this.mappings.values());
	}

	/**
	 * 清空所有映射关系
	 */
	async clearAll(): Promise<void> {
		this.mappings.clear();
		await this.save();
	}

	/**
	 * 通过卡片ID查找文件路径
	 */
	getFilePathByCardId(cardId: string): string | null {
		for (const [filePath, mapping] of this.mappings) {
			if (mapping.cardId === cardId) {
				return filePath;
			}
		}
		return null;
	}

	/**
	 * 批量更新映射关系
	 */
	async batchUpdate(updates: Array<{ filePath: string; cardId: string; title: string }>): Promise<void> {
		for (const update of updates) {
			const mapping: FileCardMapping = {
				filePath: update.filePath,
				cardId: update.cardId,
				lastSync: new Date().toISOString(),
				title: update.title
			};
			this.mappings.set(update.filePath, mapping);
		}
		await this.save();
	}
}
