/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { ServicesAccessor } from '../../../../editor/browser/editorExtensions.js';
import { localize } from '../../../../nls.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { EditorPaneDescriptor, IEditorPaneRegistry } from '../../../browser/editor.js';
import { IWorkbenchContribution, registerWorkbenchContribution2, WorkbenchPhase } from '../../../common/contributions.js';
import { EditorExtensions, IEditorFactoryRegistry } from '../../../common/editor.js';
import { TestEditor, TestEditorInput, TestEditorInputSerializer } from './testEditor.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { TestReactEditor, TestReactEditorInput, TestReactEditorInputSerializer } from './testReactEditor.js';

class MyTestContribution extends Disposable implements IWorkbenchContribution {
	static readonly ID = 'workbench.contrib.myTest';

	constructor() {
		super();

		this._register(Registry.as<IEditorPaneRegistry>(EditorExtensions.EditorPane).registerEditorPane(
			EditorPaneDescriptor.create(
				TestEditor,
				TestEditor.ID,
				localize('testEditor', "Test Editor")
			),
			[new SyncDescriptor(TestEditorInput)],
		));

		this._register(Registry.as<IEditorPaneRegistry>(EditorExtensions.EditorPane).registerEditorPane(
			EditorPaneDescriptor.create(
				TestReactEditor,
				TestReactEditor.ID,
				localize('testReactEditor', "Test React Editor")
			),
			[new SyncDescriptor(TestEditorInput)],
		));

		// Register serializer to enable recovery on restart
		this._register(Registry.as<IEditorFactoryRegistry>(EditorExtensions.EditorFactory).registerEditorSerializer(
			TestEditorInput.ID,
			TestEditorInputSerializer,
		));

		this._register(Registry.as<IEditorFactoryRegistry>(EditorExtensions.EditorFactory).registerEditorSerializer(
			TestReactEditorInput.ID,
			TestReactEditorInputSerializer,
		));

		this._register(registerAction2(class extends Action2 {
			constructor() {
				super({
					id: 'workbench.action.openTestEditor',
					title: {
						value: localize('openTestEditor', "Open Test Editor"),
						original: 'Open Test Editor',
					},
					category: 'Developer',
					f1: true,
				});
			}

			run(accessor: ServicesAccessor) {
				const editorGroupService = accessor.get(IEditorGroupsService);
				const contents = ['Hello World!', 'Hello VSCode!', 'Hello Test Editor!', 'Hello Editor!', 'Hello Universe!'];
				const randomIndex = Math.floor(Math.random() * contents.length);
				const randomContent = contents[randomIndex];
				const input = new TestEditorInput(randomContent);
				editorGroupService.activeGroup.openEditor(input).catch(console.error);
			}
		}));

		this._register(registerAction2(class extends Action2 {
			constructor() {
				super({
					id: 'workbench.action.openTestReactEditor',
					title: {
						value: localize('openTestReactEditor', "Open Test React Editor"),
						original: 'Open Test React Editor',
					},
					category: 'Developer',
					f1: true,
				});
			}

			run(accessor: ServicesAccessor) {
				const editorGroupService = accessor.get(IEditorGroupsService);
				const contents = ['Hello World!', 'Hello VSCode!', 'Hello Test React Editor!', 'Hello Editor!', 'Hello Universe!'];
				const randomIndex = Math.floor(Math.random() * contents.length);
				const randomContent = contents[randomIndex];
				const input = new TestReactEditorInput(randomContent);
				editorGroupService.activeGroup.openEditor(input).catch(console.error);
			}
		}));
	}
}

registerWorkbenchContribution2(MyTestContribution.ID, MyTestContribution, WorkbenchPhase.BlockStartup);
