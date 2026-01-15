import { App, Modal, Notice, Setting } from 'obsidian';
import { FileInfo } from './types';
import { KnowledgeCardAPI } from './api';
import { CardMappingManager } from './CardMappingManager';

export class FileSelectorModal extends Modal {
	private files: FileInfo[];
	private api: KnowledgeCardAPI;
	private mappingManager: CardMappingManager;
	private onSubmit: (files: FileInfo[]) => void;
	private fileElements: Map<string, HTMLElement>;
	private isGenerating: boolean;
	private progressContainer: HTMLElement;
	private statusContainer: HTMLElement;

	constructor(
		app: App, 
		files: FileInfo[], 
		api: KnowledgeCardAPI,
		mappingManager: CardMappingManager,
		onSubmit: (files: FileInfo[]) => void
	) {
		super(app);
		this.files = files;
		this.api = api;
		this.mappingManager = mappingManager;
		this.onSubmit = onSubmit;
		this.fileElements = new Map();
		this.isGenerating = false;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.addClass('kc-modal');

		// 标题
		contentEl.createEl('h2', { text: '选择要同步的文件' });

		// 说明文字
		contentEl.createEl('p', { 
			text: '选择已打开的文件，点击"生成知识卡片"按钮将内容同步到知识卡片系统' 
		});

		// 状态显示区域
		this.statusContainer = contentEl.createDiv('kc-status');
		this.statusContainer.style.display = 'none';

		// 进度条
		this.progressContainer = contentEl.createDiv('kc-progress');
		this.progressContainer.style.display = 'none';

		// 全选/取消全选
		new Setting(contentEl)
			.setName('全选/取消全选')
			.addButton(button => button
				.setButtonText('全选')
				.onClick(() => this.selectAll(true)))
			.addButton(button => button
				.setButtonText('取消全选')
				.onClick(() => this.selectAll(false)));

		// 文件列表
		const fileList = contentEl.createDiv('kc-file-list');
		
		if (this.files.length === 0) {
			fileList.createEl('p', { 
				text: '没有打开的文件。请先打开一些Markdown文件。' 
			});
		} else {
			this.files.forEach(file => {
				this.createFileItem(fileList, file);
			});
		}

		// 按钮组
		const buttonGroup = contentEl.createDiv('kc-button-group');
		
		// 取消按钮
		new Setting(buttonGroup)
			.addButton(button => button
				.setButtonText('取消')
				.onClick(() => this.close()));

		// 生成按钮
		new Setting(buttonGroup)
			.addButton(button => button
				.setButtonText('生成知识卡片')
				.setCta()
				.onClick(() => this.handleGenerate()));
	}

	private createFileItem(container: HTMLElement, file: FileInfo) {
		const item = container.createDiv('kc-file-item');
		if (file.selected) {
			item.addClass('selected');
		}

		// 复选框
		const checkbox = item.createEl('input', {
			type: 'checkbox',
			cls: 'kc-file-checkbox'
		});
		checkbox.checked = file.selected;
		checkbox.addEventListener('change', (e) => {
			file.selected = (e.target as HTMLInputElement).checked;
			if (file.selected) {
				item.addClass('selected');
			} else {
				item.removeClass('selected');
			}
		});

		// 文件名
		item.createEl('span', {
			text: file.name,
			cls: 'kc-file-name'
		});

		// 文件路径
		item.createEl('span', {
			text: file.path,
			cls: 'kc-file-path'
		});

		// 点击整行也能选中
		item.addEventListener('click', (e) => {
			if (e.target !== checkbox) {
				checkbox.checked = !checkbox.checked;
				checkbox.dispatchEvent(new Event('change'));
			}
		});

		this.fileElements.set(file.path, item);
	}

	private selectAll(selected: boolean) {
		this.files.forEach(file => {
			file.selected = selected;
		});

		// 更新UI
		this.fileElements.forEach((element, path) => {
			const checkbox = element.querySelector('.kc-file-checkbox') as HTMLInputElement;
			if (checkbox) {
				checkbox.checked = selected;
			}
			if (selected) {
				element.addClass('selected');
			} else {
				element.removeClass('selected');
			}
		});
	}

	private showStatus(message: string, type: 'success' | 'error' | 'loading') {
		this.statusContainer.style.display = 'block';
		this.statusContainer.className = `kc-status ${type}`;
		this.statusContainer.setText(message);
	}

	private hideStatus() {
		this.statusContainer.style.display = 'none';
	}

	private updateProgress(current: number, total: number) {
		if (total === 0) {
			this.progressContainer.style.display = 'none';
			return;
		}

		this.progressContainer.style.display = 'block';
		this.progressContainer.empty();

		const progressBar = this.progressContainer.createDiv('kc-progress-bar');
		const progressFill = progressBar.createDiv('kc-progress-fill');
		
		const percentage = Math.round((current / total) * 100);
		progressFill.style.width = `${percentage}%`;
		progressFill.setText(`${current}/${total} (${percentage}%)`);
	}

	private async handleGenerate() {
		const selectedFiles = this.files.filter(f => f.selected);
		
		if (selectedFiles.length === 0) {
			new Notice('请至少选择一个文件');
			return;
		}

		if (this.isGenerating) {
			return;
		}

		// 检查是否有文件已经同步过
		const duplicateFiles: Array<{ file: FileInfo; mapping: any }> = [];
		for (const file of selectedFiles) {
			const mapping = this.mappingManager.getMapping(file.path);
			if (mapping) {
				duplicateFiles.push({ file, mapping });
			}
		}

		// 如果有重复文件，先询问用户
		if (duplicateFiles.length > 0) {
			const fileNames = duplicateFiles.map(d => d.file.name).join('、');
			const shouldContinue = confirm(
				`以下文件已经同步过：\n\n${fileNames}\n\n` +
				`继续将删除旧卡片及其所有知识点和题目，并重新生成。\n\n` +
				`是否继续？`
			);
			
			if (!shouldContinue) {
				new Notice('已取消批量同步');
				return;
			}

			// 删除所有重复文件的旧卡片
			this.showStatus('正在删除旧卡片...', 'loading');
			for (const { file, mapping } of duplicateFiles) {
				try {
					await this.api.deleteCard(mapping.cardId);
					await this.mappingManager.removeMapping(file.path);
				} catch (error) {
					new Notice(`删除 ${file.name} 的旧卡片失败: ${error.message}`);
				}
			}
		}

		this.isGenerating = true;
		this.showStatus('正在生成知识卡片...', 'loading');

		let successCount = 0;
		let errorCount = 0;

		for (let i = 0; i < selectedFiles.length; i++) {
			const file = selectedFiles[i];
			this.updateProgress(i, selectedFiles.length);

			try {
				const result = await this.api.createCardWithKnowledge(
					file.content,
					file.name,
					[]
				);

				if (result.success && result.card) {
					// 保存映射关系
					await this.mappingManager.setMapping(
						file.path,
						result.card.card_id,
						file.name
					);
					
					successCount++;
					new Notice(`✓ ${file.name} - 卡片已创建，知识点后台生成中`);
				} else {
					errorCount++;
					new Notice(`✗ ${file.name} - ${result.error || '创建失败'}`);
				}
			} catch (error) {
				errorCount++;
				new Notice(`✗ ${file.name} - ${error.message}`);
			}
		}

		this.updateProgress(selectedFiles.length, selectedFiles.length);

		// 显示最终结果
		if (errorCount === 0) {
			this.showStatus(
				`✓ 全部完成！成功创建 ${successCount} 张卡片，知识点正在后台生成`,
				'success'
			);
		} else {
			this.showStatus(
				`完成！成功 ${successCount} 张，失败 ${errorCount} 张`,
				errorCount > successCount ? 'error' : 'success'
			);
		}

		this.isGenerating = false;

		// 3秒后关闭弹窗
		setTimeout(() => {
			this.close();
			this.onSubmit(selectedFiles);
		}, 3000);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
