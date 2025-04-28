/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import React from 'react';
// import ReactDOM from 'react-dom/client';
import { Dimension, IDomPosition } from '../../../../base/browser/dom.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { EditorPane } from '../../../browser/parts/editor/editorPane.js';
import { IEditorGroup } from '../../../services/editor/common/editorGroupsService.js';
import { EditorInput } from '../../../common/editor/editorInput.js';
import { URI } from '../../../../base/common/uri.js';
import { IEditorOpenContext, IEditorSerializer, Verbosity } from '../../../common/editor.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { IEditorOptions } from '../../../../platform/editor/common/editor.js';

// function TestReactEditorComponent(props: { content: string }) {
// 	return (
// 		<div style={{ padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '5px' }}>
// 			<h2>Test React Editor</h2>
// 			<p>{props.content}</p>
// 		</div>
// 	);
// }

console.log('Attempting to load React:', React);

export class TestReactEditor extends EditorPane {
	static readonly ID = 'workbench.editor.testReactEditor';

	private container?: HTMLElement;
	// private myInput?: TestReactEditorInput;

	constructor(group: IEditorGroup, @IThemeService themeService: IThemeService, @ITelemetryService telemetryService: ITelemetryService, @IStorageService storageService: IStorageService) {
		super(TestReactEditor.ID, group, telemetryService, themeService, storageService);
	}

	override createEditor(parent: HTMLElement): void {
		this.container = document.createElement('div');
		// const root = ReactDOM.createRoot(this.container);

		// root.render(<TestReactEditorComponent content={this.myInput?.content || ''} />);
		parent.appendChild(this.container);
	}

	override setInput(input: EditorInput, options: IEditorOptions | undefined, context: IEditorOpenContext, token: CancellationToken): Promise<void> {
		super.setInput(input, options, context, token).then(() => {
			if (input instanceof TestReactEditorInput) {
				this.container!.querySelector('div')!.innerText = input.content;
				// this.myInput = input;
			}
		});

		return Promise.resolve();
	}

	override layout(dimension: Dimension, position?: IDomPosition): void {
		if (this.container) {
			this.container.style.width = `${dimension.width}px`;
			this.container.style.height = `${dimension.height}px`;
		}
	}
}

export class TestReactEditorInput extends EditorInput {
	static readonly ID = 'workbench.editor.testReactEditorInput';

	private _content: string;

	constructor(content: string) {
		super();
		this._content = content;
	}

	override get typeId(): string {
		return TestReactEditorInput.ID;
	}

	override get resource(): URI | undefined {
		return undefined;
	}

	override getTitle(verbosity?: Verbosity): string {
		return 'Test React Editor';
	}

	override getName(): string {
		return 'Test React Editor';
	}

	get content(): string {
		return this._content;
	}

	set content(value: string) {
		this._content = value;
	}
}

export class TestReactEditorInputSerializer implements IEditorSerializer {
	canSerialize(editor: EditorInput): boolean {
		return editor instanceof TestReactEditorInput;
	}

	serialize(editor: EditorInput): string | undefined {
		if (editor instanceof TestReactEditorInput) {
			return JSON.stringify({
				id: TestReactEditorInput.ID,
				content: editor.content,
			});
		}
		return undefined;
	}

	deserialize(instantiationService: IInstantiationService, serializedEditor: string): EditorInput | undefined {
		const data = JSON.parse(serializedEditor);
		if (data.id === TestReactEditorInput.ID) {
			return instantiationService.createInstance(TestReactEditorInput, data.content);
		}
		return undefined;
	}
}
