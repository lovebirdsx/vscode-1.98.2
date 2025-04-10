/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Dimension, IDomPosition } from '../../../../base/browser/dom.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { EditorPane } from '../../../browser/parts/editor/editorPane.js';
import { IEditorGroup } from '../../../services/editor/common/editorGroupsService.js';

export class TestEditor extends EditorPane {
	static readonly ID = 'workbench.editor.testEditor';

	constructor(group: IEditorGroup, @IThemeService themeService: IThemeService, @ITelemetryService telemetryService: ITelemetryService, @IStorageService storageService: IStorageService) {
		super(TestEditor.ID, group, telemetryService, themeService, storageService);
	}


	override createEditor(parent: HTMLElement): void {
		const container = document.createElement('div');
		container.style.fontSize = '20px';
		container.style.textAlign = 'center';
		container.style.marginTop = '20px';
		container.innerText = 'Hello World!';
		parent.appendChild(container);
	}

	override layout(dimension: Dimension, position?: IDomPosition): void {
		//
	}
}
