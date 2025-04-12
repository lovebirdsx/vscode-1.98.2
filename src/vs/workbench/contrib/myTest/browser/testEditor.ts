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
import { EditorInput } from '../../../common/editor/editorInput.js';
import { URI } from '../../../../base/common/uri.js';
import { IEditorOpenContext, IEditorSerializer, Verbosity } from '../../../common/editor.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { IEditorOptions } from '../../../../platform/editor/common/editor.js';

export class TestEditor extends EditorPane {
	static readonly ID = 'workbench.editor.testEditor';

	private container?: HTMLElement;
	private myInput?: TestEditorInput;

	constructor(group: IEditorGroup, @IThemeService themeService: IThemeService, @ITelemetryService telemetryService: ITelemetryService, @IStorageService storageService: IStorageService) {
		super(TestEditor.ID, group, telemetryService, themeService, storageService);
	}

	override createEditor(parent: HTMLElement): void {
		const container = document.createElement('div');
		container.style.fontSize = '20px';
		container.style.textAlign = 'center';
		container.style.marginTop = '20px';
		parent.appendChild(container);

		const textElement = document.createElement('div');
		textElement.innerText = 'Hello World!';
		container.appendChild(textElement);

		// Add a button that randomly changes text content when clicked
		const button = document.createElement('button');
		button.innerText = 'Change Text';
		button.style.marginTop = '20px';
		button.onclick = () => {
			const contents = ['Hello World!', 'Hello VSCode!', 'Hello Test Editor!', 'Hello Editor!', 'Hello Universe!'];
			const randomIndex = Math.floor(Math.random() * contents.length);
			const randomContent = contents[randomIndex];
			if (this.container) {
				this.container.querySelector('div')!.innerText = randomContent;
				if (this.myInput) {
					this.myInput.content = randomContent;
				}
			}
		};
		container.appendChild(button);

		this.container = container;
	}

	override setInput(input: EditorInput, options: IEditorOptions | undefined, context: IEditorOpenContext, token: CancellationToken): Promise<void> {
		super.setInput(input, options, context, token).then(() => {
			if (input instanceof TestEditorInput) {
				this.container!.querySelector('div')!.innerText = input.content;
				this.myInput = input;
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

export class TestEditorInput extends EditorInput {
	static readonly ID = 'workbench.editor.testEditorInput';

	private _content: string;

	constructor(content: string) {
		super();
		this._content = content;
	}

	override get typeId(): string {
		return TestEditorInput.ID;
	}

	override get resource(): URI | undefined {
		return undefined;
	}

	override getTitle(verbosity?: Verbosity): string {
		return 'Test Editor';
	}

	override getName(): string {
		return 'Test Editor';
	}

	get content(): string {
		return this._content;
	}

	set content(value: string) {
		this._content = value;
	}
}

export class TestEditorInputSerializer implements IEditorSerializer {
	canSerialize(editor: EditorInput): boolean {
		return editor instanceof TestEditorInput;
	}

	serialize(editor: EditorInput): string | undefined {
		if (editor instanceof TestEditorInput) {
			return JSON.stringify({
				id: TestEditorInput.ID,
				content: editor.content,
			});
		}
		return undefined;
	}

	deserialize(instantiationService: IInstantiationService, serializedEditor: string): EditorInput | undefined {
		const data = JSON.parse(serializedEditor);
		if (data.id === TestEditorInput.ID) {
			return instantiationService.createInstance(TestEditorInput, data.content);
		}
		return undefined;
	}
}
