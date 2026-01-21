import { Plugin, Notice, WorkspaceLeaf, Modal, App, MarkdownView, TFile } from 'obsidian';
import { KnowledgeCardSettings, DEFAULT_SETTINGS, FileInfo } from './types';
import { KnowledgeCardAPI } from './api';
import { FileSelectorModal } from './FileSelectorModal';
import { KnowledgeCardSettingTab } from './SettingTab';
import { CardMappingManager } from './CardMappingManager';
import { KnowledgePointView, KNOWLEDGE_POINT_VIEW_TYPE } from './KnowledgePointView';

export default class KnowledgeCardPlugin extends Plugin {
	settings: KnowledgeCardSettings;
	api: KnowledgeCardAPI;
	mappingManager: CardMappingManager;

	async onload() {
		// 加载设置
		await this.loadSettings();

		// 初始化映射管理器
		this.mappingManager = new CardMappingManager(this);
		await this.mappingManager.load();

		// 初始化API
		this.api = new KnowledgeCardAPI(this.settings);

		// 添加ribbon图标
		this.addRibbonIcon('upload-cloud', 'Knowledge Card Sync', (evt: MouseEvent) => {
			void this.openFileSelectorModal();
		});

		// 添加命令：打开文件选择器
		this.addCommand({
			id: 'open-file-selector',
			name: '同步已打开的文件到知识卡片',
			callback: () => {
				void this.openFileSelectorModal();
			}
		});

		// 添加命令：同步当前文件
		this.addCommand({
			id: 'sync-current-file',
			name: '同步当前文件到知识卡片',
			callback: () => {
				void this.syncCurrentFile();
			}
		});

		// 添加命令：验证Token
		this.addCommand({
			id: 'validate-token',
			name: '验证API Token',
			callback: () => {
				void this.api.validateToken().then((valid) => {
					if (valid) {
						new Notice('✓ Token验证成功');
					} else {
						new Notice('✗ Token验证失败，请检查设置');
					}
				});
			}
		});

		// 添加命令：打开知识点查看器
		this.addCommand({
			id: 'open-knowledge-point-view',
			name: '打开知识点查看器',
			callback: () => {
				void this.activateKnowledgePointView();
			}
		});

		// 注册知识点视图
		this.registerView(
			KNOWLEDGE_POINT_VIEW_TYPE,
			(leaf) => new KnowledgePointView(leaf, this.api, this.mappingManager)
		);

		// 添加ribbon图标 - 知识点查看器
		this.addRibbonIcon('book-open', '知识点查看器', (evt: MouseEvent) => {
			void this.activateKnowledgePointView();
		});

		// 添加设置选项卡
		this.addSettingTab(new KnowledgeCardSettingTab(this.app, this));

		// 自动同步功能（如果启用）
		if (this.settings.autoSync) {
			this.registerEvent(
				this.app.vault.on('modify', (file) => {
					if (file instanceof TFile && file.extension === 'md') {
						// TODO: 添加防抖逻辑和自动同步实现
					}
				})
			);
		}
	}

	onunload() {
		// Plugin cleanup
	}

	/**
	 * 激活知识点查看器视图
	 */
	async activateKnowledgePointView() {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(KNOWLEDGE_POINT_VIEW_TYPE);

		if (leaves.length > 0) {
			// 如果已经有打开的视图，直接激活
			leaf = leaves[0];
		} else {
			// 否则在右侧创建新视图
			leaf = workspace.getRightLeaf(false);
			if (leaf) {
				await leaf.setViewState({ type: KNOWLEDGE_POINT_VIEW_TYPE, active: true });
			}
		}

		// 激活视图所在的leaf
		if (leaf) {
			void workspace.revealLeaf(leaf);
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
		if (this.api) {
			this.api.updateSettings(this.settings);
		}
	}

	/**
	 * 获取所有已打开的Markdown文件
	 */
	private async getOpenFiles(): Promise<FileInfo[]> {
		const openFiles: FileInfo[] = [];
		const leaves = this.app.workspace.getLeavesOfType('markdown');

		for (const leaf of leaves) {
			const view = leaf.view as MarkdownView;
			if (view.getViewType() === 'markdown') {
				const file = view.file;
				if (file) {
					const content = await this.app.vault.read(file);
					openFiles.push({
						path: file.path,
						name: file.basename,
						content: content,
						selected: false
					});
				}
			}
		}

		return openFiles;
	}

	/**
	 * 打开文件选择器模态框
	 */
	private async openFileSelectorModal() {
		// 检查Token
		if (!this.settings.apiToken) {
			new Notice('请先在设置中配置API Token');
			return;
		}

		const openFiles = await this.getOpenFiles();
		
		if (openFiles.length === 0) {
			new Notice('没有打开的Markdown文件');
			return;
		}

		new FileSelectorModal(
			this.app,
			openFiles,
			this.api,
			this.mappingManager,
			(selectedFiles) => {
				if (this.settings.debugMode) {
					console.debug('[KC Plugin] Selected files:', selectedFiles);
				}
			}
		).open();
	}

	/**
	 * 同步当前活动文件
	 */
	private async syncCurrentFile() {
		// 检查Token
		if (!this.settings.apiToken) {
			new Notice('请先在设置中配置API Token');
			return;
		}

		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeView) {
			new Notice('请先打开一个Markdown文件');
			return;
		}

		const file = activeView.file;
		if (!file) {
			new Notice('当前没有活动文件');
			return;
		}

		// 检查是否已经同步过
		const existingMapping = this.mappingManager.getMapping(file.path);
		
		if (existingMapping) {
			// 已经同步过，询问用户是否重新生成
			const shouldRegenerate = await this.confirmRegenerate(
				file.basename,
				existingMapping
			);
			
			if (!shouldRegenerate) {
				new Notice('已取消同步');
				return;
			}
			
			// 删除旧卡片
			try {
				new Notice('正在删除旧卡片...');
				await this.api.deleteCard(existingMapping.cardId);
				await this.mappingManager.removeMapping(file.path);
				new Notice('✓ 旧卡片已删除');
			} catch (err) {
				const errorMessage = err instanceof Error ? err.message : String(err);
				new Notice(`删除旧卡片失败: ${errorMessage}`);
				return;
			}
		}

		try {
			const content = await this.app.vault.read(file);
			
			new Notice('正在创建知识卡片...');
			
			const result = await this.api.createCardWithKnowledge(
				content,
				file.basename,
				this.settings.defaultTags
			);

			if (result.success && result.card) {
				// 保存映射关系
				await this.mappingManager.setMapping(
					file.path,
					result.card.card_id,
					file.basename
				);
				
				new Notice(`✓ ${file.basename} - 卡片已创建，知识点正在后台生成`);
				if (this.settings.debugMode) {
					console.debug('[KC Plugin] Created card:', result.card?.card_id);
					console.debug('[KC Plugin] Mapping saved:', file.path, '->', result.card?.card_id);
				}
			} else {
				new Notice(`✗ 创建失败: ${result.error || '未知错误'}`);
			}
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : String(err);
			new Notice(`✗ 同步失败: ${errorMessage}`);
		}
	}

	/**
	 * 确认是否重新生成卡片
	 */
	private async confirmRegenerate(
		fileName: string,
		mapping: { cardId: string; lastSync: string; title: string }
	): Promise<boolean> {
		return new Promise((resolve) => {
			const modal = new ConfirmRegenerateModal(
				this.app,
				fileName,
				mapping,
				(result) => resolve(result)
			);
			modal.open();
		});
	}
}

/**
 * 确认重新生成的对话框
 */
class ConfirmRegenerateModal extends Modal {
	private fileName: string;
	private mapping: { cardId: string; lastSync: string; title: string };
	private callback: (result: boolean) => void;

	constructor(
		app: App,
		fileName: string,
		mapping: { cardId: string; lastSync: string; title: string },
		callback: (result: boolean) => void
	) {
		super(app);
		this.fileName = fileName;
		this.mapping = mapping;
		this.callback = callback;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h2', { text: '⚠️ Duplicate submission detected' });

		const infoDiv = contentEl.createDiv({ cls: 'kc-confirm-info' });
		infoDiv.createEl('p', { text: `文件「${this.fileName}」已经同步过知识卡片。` });
		
		const detailsDiv = infoDiv.createDiv({ cls: 'kc-mapping-details' });
		detailsDiv.createEl('div', { text: `卡片ID: ${this.mapping.cardId}` });
		detailsDiv.createEl('div', { 
			text: `上次同步: ${new Date(this.mapping.lastSync).toLocaleString('zh-CN')}` 
		});

		contentEl.createEl('p', { 
			text: '如果继续，将删除旧卡片及其所有知识点和题目，并重新生成。',
			cls: 'kc-warning-text'
		});

		const buttonDiv = contentEl.createDiv({ cls: 'kc-button-group' });
		
		// 取消按钮
		const cancelBtn = buttonDiv.createEl('button', { text: '取消' });
		cancelBtn.addEventListener('click', () => {
			this.callback(false);
			this.close();
		});

		// 确认按钮
		const confirmBtn = buttonDiv.createEl('button', { 
			text: '删除并重新生成',
			cls: 'mod-warning'
		});
		confirmBtn.addEventListener('click', () => {
			this.callback(true);
			this.close();
		});
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}
}
