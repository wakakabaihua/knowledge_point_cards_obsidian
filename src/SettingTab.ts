import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import KnowledgeCardPlugin from './main';

export class KnowledgeCardSettingTab extends PluginSettingTab {
	plugin: KnowledgeCardPlugin;

	constructor(app: App, plugin: KnowledgeCardPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'Knowledge Card Sync 设置' });

		// API配置部分
		containerEl.createEl('h3', { text: 'API配置' });

		new Setting(containerEl)
			.setName('API地址')
			.setDesc('知识卡片后端API的基础URL（默认无需修改）')
			.addText(text => text
				.setPlaceholder('https://www.xiaoxiaodu.cn')
				.setValue(this.plugin.settings.apiBaseUrl)
				.onChange(async (value) => {
					this.plugin.settings.apiBaseUrl = value;
					await this.plugin.saveSettings();
					this.plugin.api.updateSettings(this.plugin.settings);
				}));

		new Setting(containerEl)
			.setName('API Token')
			.setDesc('用于认证的Token，请前往 https://www.xiaoxiaodu.cn/obsidian-plugin 获取')
			.addText(text => {
				text.setPlaceholder('输入您的Token')
					.setValue(this.plugin.settings.apiToken)
					.onChange(async (value) => {
						this.plugin.settings.apiToken = value;
						await this.plugin.saveSettings();
						this.plugin.api.updateSettings(this.plugin.settings);
					});
				text.inputEl.type = 'password';
			})
			.addButton(button => button
				.setButtonText('验证')
				.onClick(async () => {
					const valid = await this.plugin.api.validateToken();
					if (valid) {
						new Notice('✓ Token验证成功');
					} else {
						new Notice('✗ Token验证失败，请检查Token是否正确');
					}
				}));

		// 同步配置部分
		containerEl.createEl('h3', { text: '同步配置' });

		new Setting(containerEl)
			.setName('自动同步')
			.setDesc('保存文件时自动同步到知识卡片系统（暂未实现）')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoSync)
				.onChange(async (value) => {
					this.plugin.settings.autoSync = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('默认标签')
			.setDesc('创建卡片时自动添加的标签，用逗号分隔')
			.addText(text => text
				.setPlaceholder('例如: 学习,笔记')
				.setValue(this.plugin.settings.defaultTags.join(', '))
				.onChange(async (value) => {
					this.plugin.settings.defaultTags = value
						.split(',')
						.map(t => t.trim())
						.filter(t => t.length > 0);
					await this.plugin.saveSettings();
				}));

		// 生成配置部分
		containerEl.createEl('h3', { text: '生成配置' });

		new Setting(containerEl)
			.setName('生成知识点')
			.setDesc('创建卡片后自动生成知识点')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.generateKnowledgePoints)
				.onChange(async (value) => {
					this.plugin.settings.generateKnowledgePoints = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('生成练习题')
			.setDesc('创建知识点后自动生成练习题')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.generateQuestions)
				.onChange(async (value) => {
					this.plugin.settings.generateQuestions = value;
					await this.plugin.saveSettings();
				}));

		// 调试选项
		containerEl.createEl('h3', { text: '调试选项' });

		new Setting(containerEl)
			.setName('调试模式')
			.setDesc('在控制台输出详细的API调用日志')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.debugMode)
				.onChange(async (value) => {
					this.plugin.settings.debugMode = value;
					await this.plugin.saveSettings();
				}));

		// 快捷操作
		containerEl.createEl('h3', { text: '快捷操作' });

		new Setting(containerEl)
			.setName('测试连接')
			.setDesc('测试与知识卡片后端的连接')
			.addButton(button => button
				.setButtonText('测试')
				.onClick(async () => {
					try {
						const valid = await this.plugin.api.validateToken();
						if (valid) {
							new Notice('✓ 连接成功！');
						} else {
							new Notice('✗ 连接失败，请检查API地址和Token');
						}
					} catch (error) {
						new Notice(`✗ 连接错误: ${error.message}`);
					}
				}));

		new Setting(containerEl)
			.setName('查看卡片列表')
			.setDesc('在控制台输出所有卡片')
			.addButton(button => button
				.setButtonText('查看')
				.onClick(async () => {
					try {
						const cards = await this.plugin.api.getCards();
						if (this.plugin.settings.debugMode) {
							console.log('[KC Plugin] Knowledge Cards:', cards);
						}
						new Notice(`找到 ${cards.length} 张卡片${this.plugin.settings.debugMode ? '，详情见控制台' : ''}`);
					} catch (error) {
						new Notice(`✗ 获取失败: ${error.message}`);
					}
				}));
	}
}
