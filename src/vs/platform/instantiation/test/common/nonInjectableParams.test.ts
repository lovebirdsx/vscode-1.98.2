/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * # 非注入型参数的服务构造最佳实践
 *
 * ## 背景
 *
 * VS Code 的依赖注入（DI）系统通过 `@IServiceIdentifier` 装饰器标记需要注入的构造参数。
 * `InstantiationService.createInstance` 会自动解析这些装饰参数，无需手动传入。
 *
 * 对于 **全部参数均为注入型** 的服务：
 *   - 直接调用 `createInstance(MyCtor)` 即可完全自动化构造
 *   - 或通过 `SyncDescriptor(MyCtor)` 注册为单例后按需延迟实例化
 *
 * 然而，部分服务构造函数除了注入型服务参数外，还带有 **非注入型参数**（如配置对象、
 * 字符串 ID、标志位等）。本文件通过可运行的测试归纳项目中的经典做法，并给出最佳实践。
 *
 * ## 核心规则（类型系统强制）
 *
 * 非注入型参数 **必须** 排在构造函数参数列表的 **最前面**，所有 `@IService` 装饰的注入
 * 型参数排在其后。`GetLeadingNonServiceArgs<ConstructorParameters<Ctor>>` 工具类型会在
 * 编译期提取最前面的非服务参数，保证传参正确性。
 *
 * ## 四种经典做法（按推荐度排序）
 *
 * | 做法 | 适用场景 |
 * |------|----------|
 * | 1. 全注入 — 零参数直接 createInstance | 无非注入参数时（最简洁） |
 * | 2. SyncDescriptor + staticArguments | 服务注册时固定参数，延迟/单例实例化 |
 * | 3. createInstance 传入前置参数 | 运行时才知道参数，临时/多实例场景 |
 * | 4. 工厂方法模式 | 参数来源复杂、需要封装逻辑时 |
 */

import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { SyncDescriptor } from '../../common/descriptors.js';
import { BrandedService, createDecorator, IInstantiationService } from '../../common/instantiation.js';
import { InstantiationService } from '../../common/instantiationService.js';
import { ServiceCollection } from '../../common/serviceCollection.js';

// ---------------------------------------------------------------------------
// 辅助服务定义（仅供本文件测试使用）
// ---------------------------------------------------------------------------

const ILogService = createDecorator<ILogService>('logService_nonInjectableParamsTest');
interface ILogService extends BrandedService {
	log(msg: string): void;
}
class LogService implements ILogService {
	declare readonly _serviceBrand: undefined;
	readonly messages: string[] = [];
	log(msg: string): void { this.messages.push(msg); }
}

const IConfigService = createDecorator<IConfigService>('configService_nonInjectableParamsTest');
interface IConfigService extends BrandedService {
	get(key: string): string | undefined;
}
class ConfigService implements IConfigService {
	declare readonly _serviceBrand: undefined;
	private readonly _store = new Map<string, string>();
	constructor(entries: [string, string][] = []) {
		for (const [k, v] of entries) {
			this._store.set(k, v);
		}
	}
	get(key: string): string | undefined { return this._store.get(key); }
}

// ---------------------------------------------------------------------------
// 做法 1 – 全注入型参数：完全自动化构造
// ---------------------------------------------------------------------------

/**
 * 当构造函数的所有参数都带有 `@IService` 装饰时，无需额外操作，
 * `createInstance(Ctor)` 或 `SyncDescriptor(Ctor)` 均可完全自动化。
 */
class FullyInjectedService {
	readonly label = 'fullyInjected';
	constructor(
		@ILogService private readonly logService: ILogService,
		@IConfigService private readonly configService: IConfigService,
	) { }

	greet(): string {
		const name = this.configService.get('name') ?? 'World';
		this.logService.log(`Hello, ${name}!`);
		return `Hello, ${name}!`;
	}
}

// ---------------------------------------------------------------------------
// 做法 2 – SyncDescriptor + staticArguments：服务注册时固定非注入参数
// ---------------------------------------------------------------------------

/**
 * 使用场景：在进行单例服务注册时，需要将某些配置值（如视图 ID、渠道名称、选项对象）
 * 固定下来，但服务本身仍需通过 DI 获取其他依赖。
 *
 * 将非注入型参数传入 `SyncDescriptor` 的第二个参数 `staticArguments`：
 *   `new SyncDescriptor(MyCtor, [arg1, arg2])`
 *
 * 实例化时，框架会将 staticArguments 拼在 createInstance 所传参数之前，
 * 再在最后追加所有注入型服务参数，最终调用构造函数。
 */
class ViewPanelService {
	constructor(
		readonly viewId: string,                    // 非注入型：视图 ID
		readonly options: { flexibleHeight: boolean }, // 非注入型：选项对象
		@ILogService private readonly logService: ILogService,
	) { }

	render(): string {
		this.logService.log(`Rendering ${this.viewId}`);
		return `${this.viewId}:${this.options.flexibleHeight}`;
	}
}

// ---------------------------------------------------------------------------
// 做法 3 – createInstance(Ctor, ...leadingArgs)：运行时传入前置参数
// ---------------------------------------------------------------------------

/**
 * 使用场景：非注入参数在调用时才确定（例如从用户交互、运行时状态获取），
 * 或者需要创建多个不同配置的实例。
 *
 * 直接在 `createInstance` 调用时将非注入参数作为第 2、3… 个参数传入：
 *   `instantiationService.createInstance(MyCtor, nonInjectableArg1, nonInjectableArg2)`
 *
 * TypeScript 通过 `GetLeadingNonServiceArgs<ConstructorParameters<Ctor>>` 在编译期
 * 校验这些参数的类型和数量，多传或少传均会报错。
 */
class WidgetController {
	constructor(
		readonly widgetId: string,    // 非注入型：widget 标识
		readonly initialCount: number, // 非注入型：初始计数
		@ILogService private readonly logService: ILogService,
	) { }

	describe(): string {
		this.logService.log(`Widget ${this.widgetId} count=${this.initialCount}`);
		return `${this.widgetId}:${this.initialCount}`;
	}
}

// ---------------------------------------------------------------------------
// 做法 4 – 工厂方法模式：封装复杂的构造逻辑
// ---------------------------------------------------------------------------

/**
 * 使用场景：当非注入型参数来源复杂（需要读取配置、做类型判断等），
 * 或者同一构造逻辑需要在多处复用时，可将 `createInstance` 调用封装到
 * 一个工厂方法或工厂类中。
 *
 * 工厂本身通过 DI 注入 `IInstantiationService`，在方法内按需调用
 * `createInstance` 并传入非注入型参数，对调用方屏蔽细节。
 */
class ReportService {
	constructor(
		readonly reportType: 'csv' | 'json', // 非注入型：报告格式
		readonly title: string,              // 非注入型：报告标题
		@ILogService private readonly logService: ILogService,
	) { }

	generate(): string {
		this.logService.log(`Generating ${this.reportType} report: ${this.title}`);
		return `[${this.reportType}] ${this.title}`;
	}
}

/**
 * 工厂服务：通过注入的 `IInstantiationService` 创建 `ReportService` 实例，
 * 将非注入型参数的传递细节封装在此处。
 */
class ReportServiceFactory {
	constructor(
		@IInstantiationService private readonly instantiationService: IInstantiationService,
	) { }

	createCsvReport(title: string): ReportService {
		return this.instantiationService.createInstance(ReportService, 'csv', title);
	}

	createJsonReport(title: string): ReportService {
		return this.instantiationService.createInstance(ReportService, 'json', title);
	}
}

// ---------------------------------------------------------------------------
// 测试套件
// ---------------------------------------------------------------------------

suite('Non-Injectable Params — Service Construction Best Practices', () => {

	ensureNoDisposablesAreLeakedInTestSuite();

	function makeInstantiationService(): IInstantiationService {
		const collection = new ServiceCollection();
		const insta = new InstantiationService(collection);
		collection.set(ILogService, new LogService());
		collection.set(IConfigService, new ConfigService([['name', 'VS Code']]));
		return insta;
	}

	// -------------------------------------------------------------------------
	// 做法 1 测试
	// -------------------------------------------------------------------------

	suite('Pattern 1 — All-injectable: fully automatic construction', () => {

		test('createInstance(Ctor) — zero extra args needed', function () {
			const insta = makeInstantiationService();
			// 无需传任何额外参数，框架自动解析所有 @I* 依赖
			const svc = insta.createInstance(FullyInjectedService);
			assert.strictEqual(svc.greet(), 'Hello, VS Code!');
		});

		test('SyncDescriptor(Ctor) — lazy singleton, no extra args', function () {
			const IFullyInjectedService = createDecorator<FullyInjectedService>('fullyInjectedService_nonInjectableParamsTest');
			const collection = new ServiceCollection();
			collection.set(ILogService, new LogService());
			collection.set(IConfigService, new ConfigService([['name', 'World']]));
			// 注册为延迟单例，框架在首次使用时自动实例化
			collection.set(IFullyInjectedService, new SyncDescriptor(FullyInjectedService));
			const insta = new InstantiationService(collection);

			insta.invokeFunction(accessor => {
				const svc = accessor.get(IFullyInjectedService);
				assert.strictEqual(svc.greet(), 'Hello, World!');
				// 单例验证：多次获取返回同一实例
				assert.strictEqual(accessor.get(IFullyInjectedService), svc);
			});
		});
	});

	// -------------------------------------------------------------------------
	// 做法 2 测试
	// -------------------------------------------------------------------------

	suite('Pattern 2 — SyncDescriptor with staticArguments: fixed params at registration time', () => {

		test('non-injectable params baked into SyncDescriptor', function () {
			const IViewPanel = createDecorator<ViewPanelService>('viewPanel_nonInjectableParamsTest');
			const collection = new ServiceCollection();
			const insta = new InstantiationService(collection);
			collection.set(ILogService, new LogService());

			// 注册时将非注入型参数放入 staticArguments
			collection.set(IViewPanel, new SyncDescriptor(
				ViewPanelService,
				['explorer', { flexibleHeight: true }] // staticArguments
			));

			insta.invokeFunction(accessor => {
				const panel = accessor.get(IViewPanel);
				assert.strictEqual(panel.viewId, 'explorer');
				assert.strictEqual(panel.options.flexibleHeight, true);
				assert.strictEqual(panel.render(), 'explorer:true');
			});
		});

		test('different registrations produce distinct configurations', function () {
			const IPanel1 = createDecorator<ViewPanelService>('panel1_nonInjectableParamsTest');
			const IPanel2 = createDecorator<ViewPanelService>('panel2_nonInjectableParamsTest');
			const logSvc = new LogService();
			const collection = new ServiceCollection();
			const insta = new InstantiationService(collection);
			collection.set(ILogService, logSvc);

			// 同一构造函数，不同 staticArguments → 两个独立单例
			collection.set(IPanel1, new SyncDescriptor(ViewPanelService, ['search', { flexibleHeight: false }]));
			collection.set(IPanel2, new SyncDescriptor(ViewPanelService, ['debug', { flexibleHeight: true }]));

			insta.invokeFunction(accessor => {
				const p1 = accessor.get(IPanel1);
				const p2 = accessor.get(IPanel2);
				assert.strictEqual(p1.viewId, 'search');
				assert.strictEqual(p2.viewId, 'debug');
				assert.notStrictEqual(p1, p2);
			});
		});
	});

	// -------------------------------------------------------------------------
	// 做法 3 测试
	// -------------------------------------------------------------------------

	suite('Pattern 3 — createInstance with leading args: runtime non-injectable params', () => {

		test('pass leading non-injectable args directly to createInstance', function () {
			const insta = makeInstantiationService();

			// 运行时将非注入型参数作为 createInstance 的第 2、3… 个参数传入
			const w1 = insta.createInstance(WidgetController, 'btn-ok', 0);
			const w2 = insta.createInstance(WidgetController, 'btn-cancel', 5);

			assert.strictEqual(w1.describe(), 'btn-ok:0');
			assert.strictEqual(w2.describe(), 'btn-cancel:5');
			// 每次调用产生新实例
			assert.notStrictEqual(w1, w2);
		});

		test('createInstance merges leading args with injected services correctly', function () {
			const collection = new ServiceCollection();
			const insta = new InstantiationService(collection);
			const logSvc = new LogService();
			collection.set(ILogService, logSvc);

			const widget = insta.createInstance(WidgetController, 'toolbar', 42);
			// 非注入型参数正确设置
			assert.strictEqual(widget.widgetId, 'toolbar');
			assert.strictEqual(widget.initialCount, 42);
			// 注入型服务正确注入（调用后 logSvc 应有记录）
			widget.describe();
			assert.ok(logSvc.messages.some(m => m.includes('toolbar')));
		});
	});

	// -------------------------------------------------------------------------
	// 做法 4 测试
	// -------------------------------------------------------------------------

	suite('Pattern 4 — Factory method: encapsulate complex construction logic', () => {

		test('factory method hides non-injectable param details from callers', function () {
			const insta = makeInstantiationService();

			// 工厂本身只需通过 DI 获取，对外暴露语义化的创建方法
			const factory = insta.createInstance(ReportServiceFactory);

			const csv = factory.createCsvReport('Q1 Summary');
			const json = factory.createJsonReport('Monthly Data');

			assert.strictEqual(csv.generate(), '[csv] Q1 Summary');
			assert.strictEqual(json.generate(), '[json] Monthly Data');
		});

		test('factory registered as singleton produces fresh instances per call', function () {
			const IReportFactory = createDecorator<ReportServiceFactory>('reportFactory_nonInjectableParamsTest');
			const collection = new ServiceCollection();
			const insta = new InstantiationService(collection);
			collection.set(ILogService, new LogService());
			// 工厂本身全注入型，可直接注册为单例
			collection.set(IReportFactory, new SyncDescriptor(ReportServiceFactory));

			insta.invokeFunction(accessor => {
				const factory = accessor.get(IReportFactory);
				const r1 = factory.createJsonReport('Report A');
				const r2 = factory.createJsonReport('Report B');
				// 工厂是单例，但每次调用产生不同的报告实例
				assert.notStrictEqual(r1, r2);
				assert.strictEqual(r1.title, 'Report A');
				assert.strictEqual(r2.title, 'Report B');
			});
		});
	});

	// -------------------------------------------------------------------------
	// 最佳实践验证：非注入型参数必须排在最前
	// -------------------------------------------------------------------------

	suite('Best practice — non-injectable params must come BEFORE injectable params', () => {

		/**
		 * 正确做法：构造函数签名为 (nonInj1, nonInj2, @ISvc1 svc1, @ISvc2 svc2)
		 * 错误做法：(nonInj1, @ISvc1 svc1, nonInj2, @ISvc2 svc2)  ← 混合排列，框架无法正确合并
		 *
		 * TypeScript 工具类型 `GetLeadingNonServiceArgs` 会递归地从参数末尾剥离
		 * `BrandedService` 类型，只保留前缀的非服务参数。若非服务参数夹在服务参数之间，
		 * `createInstance` 的调用签名将无法精确表达，编译器会给出警告。
		 */
		test('correctly ordered params: non-injectable first, injectable last', function () {
			class CorrectOrder {
				constructor(
					readonly id: string,        // 非注入型（第 1 位）
					readonly priority: number,  // 非注入型（第 2 位）
					@ILogService readonly log: ILogService, // 注入型（最后）
				) { }
			}

			const insta = makeInstantiationService();
			// 编译器可精确推导出需要传 (string, number)，多传或少传均报类型错误
			const obj = insta.createInstance(CorrectOrder, 'item-1', 10);
			assert.strictEqual(obj.id, 'item-1');
			assert.strictEqual(obj.priority, 10);
			assert.ok(obj.log instanceof LogService);
		});

		test('SyncDescriptor staticArguments align with leading non-injectable positions', function () {
			class Configurable {
				constructor(
					readonly channel: string,  // 非注入型（第 1 位）
					@ILogService readonly log: ILogService, // 注入型（第 2 位）
				) { }
			}

			const IConfigurable = createDecorator<Configurable>('configurable_nonInjectableParamsTest');
			const collection = new ServiceCollection();
			const insta = new InstantiationService(collection);
			collection.set(ILogService, new LogService());
			// staticArguments 中的 'alpha' 对应构造函数第 1 位的 channel
			collection.set(IConfigurable, new SyncDescriptor(Configurable, ['alpha']));

			insta.invokeFunction(accessor => {
				const c = accessor.get(IConfigurable);
				assert.strictEqual(c.channel, 'alpha');
				assert.ok(c.log instanceof LogService);
			});
		});
	});
});
