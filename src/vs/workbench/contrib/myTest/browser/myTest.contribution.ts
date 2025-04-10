/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { ServicesAccessor } from '../../../../editor/browser/editorExtensions.js';
import { localize, localize2 } from '../../../../nls.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { EditorPaneDescriptor, IEditorPaneRegistry } from '../../../browser/editor.js';
import { IWorkbenchContribution, registerWorkbenchContribution2, WorkbenchPhase } from '../../../common/contributions.js';
import { EditorExtensions } from '../../../common/editor.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { TestEditor } from './testEditor.js';

class MyTestContribution extends Disposable implements IWorkbenchContribution {
	static readonly ID = 'workbench.contrib.myTest';

	constructor() {
		super();

		this._register(Registry.as<IEditorPaneRegistry>(EditorExtensions.EditorPane).registerEditorPane(
			EditorPaneDescriptor.create(
				TestEditor,
				TestEditor.ID,
				localize('textFileEditor', "Text File Editor")
			),
			[],
		));

		this._register(registerAction2(class extends Action2 {
			constructor() {
				super({
					id: 'workbench.action.openTestEditor',
					title: {
						...localize2('openTestEditor', "Open Test Editor"),
						mnemonicTitle: localize({ key: 'miOpenTestEditor', comment: ['&& denotes a mnemonic'] }, "&&Open Test Editor"),
					},
				});
			}
			run(accessor: ServicesAccessor) {
				const editorService = accessor.get(IEditorService);
				const resource = URI.parse('inmemory://model/testeditor');
				editorService.openEditor({
					resource,
					options: {
						override: TestEditor.ID,
					}
				});
			}
		}));
	}
}

registerWorkbenchContribution2(MyTestContribution.ID, MyTestContribution, WorkbenchPhase.AfterRestored);
