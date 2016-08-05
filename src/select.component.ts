import {Component, Input, OnChanges, OnInit, Provider, ViewChild, forwardRef} from '@angular/core';
import {CORE_DIRECTIVES, NgStyle} from '@angular/common';
import {NG_VALUE_ACCESSOR, ControlValueAccessor} from '@angular/forms';

import {DEFAULT_STYLES} from './style';
import {SelectDropdownComponent} from './select-dropdown.component';

const SELECT_VALUE_ACCESSOR = new Provider(NG_VALUE_ACCESSOR, {
    useExisting: forwardRef(() => SelectComponent),
    multi: true
});

@Component({
    selector: 'ng-select',
    template: `
<div style="width:100%;position:relative;">
    <span style="width:100%"
        #container
        [ngClass]="getContainerClass()"
        (window:resize)="onWindowResize()"
        (window:click)="onWindowClick()">
        <span class="selection">
            <span tabindex=0
                #selectionSpan
                [ngClass]="getSelectionClass()"
                (click)="onSelectionClick($event)"
                (keydown)="onKeydown($event)">

                <span class="select2-selection__rendered"
                    *ngIf="!multiple">
                    <span class="select2-selection__placeholder">
                        {{getPlaceholder()}}
                    </span>
                </span>

                <span class="select2-selection__rendered"
                    *ngIf="!multiple && selection.length > 0">
                    <span class="select2-selection__clear"
                        *ngIf="allowClear"
                        (click)="onClearAllClick($event)">
                        x
                    </span>
                    {{selection[0].label}}
                </span>

                <ul class="select2-selection__rendered"
                    *ngIf="multiple">
                    <li class="select2-selection__choice" title="{{option.label}}"
                        *ngFor="let option of selection">
                        <span class="select2-selection__choice__remove"
                            [attr.data-value]="option.value"
                            (click)=onClearItemClick($event)>
                            ×</span>
                        {{option.label}}
                    </li>
                    <li class="select2-search select2-search--inline">
                        <input class="select2-search__field"
                            #searchInput
                            placeholder="{{getPlaceholder()}}"
                            [ngStyle]="multipleInputWidth()"
                            (input)="onInput($event)"/>
                    </li>
                </ul>

                <span class="select2-selection__arrow">
                    <b></b>
                </span>
            </span>
        </span>
    </span>
    <select-dropdown
        *ngIf="isOpen"
        #dropdown
        [multiple]="multiple"
        [optionValues]="optionValues"
        [optionsDict]="optionsDict"
        [selection]="selection"
        [width]="width"
        [top]="top"
        [left]="left"
        (toggleSelect)="onToggleSelect($event)"
        (close)="onClose($event)">
    </select-dropdown>
</div>
`,
    styles: [
        DEFAULT_STYLES
    ],
    directives: [
        CORE_DIRECTIVES,
        NgStyle,
        SelectDropdownComponent
    ],
    providers: [
        SELECT_VALUE_ACCESSOR
    ]
})

export class SelectComponent implements ControlValueAccessor, OnInit, OnChanges {

    // Class names.
    private S2: string = 'select2';
    private S2_CONTAINER: string = this.S2 + '-container';
    private S2_SELECTION: string = this.S2 + '-selection';

    // Input settings.
    @Input() options: Array<any>;
    @Input() theme: string;
    @Input() multiple: boolean;
    @Input() placeholder: string;
    @Input() allowClear: boolean;

    @ViewChild('container') container: any;
    @ViewChild('selectionSpan') selectionSpan: any;
    @ViewChild('dropdown') dropdown: SelectDropdownComponent;
    @ViewChild('searchInput') searchInput: any;

    // State variables.
    private isDisabled: boolean = false;
    private isBelow: boolean = true;
    private isOpen: boolean = false;
    private hasFocus: boolean = false;

    private width: number;
    private top: number;
    private left: number;

    // Select options.
    private optionValues: Array<string> = [];
    private optionsDict: any = {};

    private selection: Array<any> = [];
    value: Array<string> = [];

    onChange = (_: any) => {};
    onTouched = () => {};

    /***************************************************************************
     * Event handlers.
     **************************************************************************/

    ngOnInit() {
        this.init();
    }

    ngOnChanges(changes: any) {
        this.init();
    }

    onSelectionClick(event: any) {
        this.toggleDropdown();

        if (this.multiple) {
            this.searchInput.nativeElement.focus();
        }
        event.stopPropagation();
    }

    onClearAllClick(event: any) {
        this.clearSelected();
        event.stopPropagation();
    }

    onClearItemClick(event: any) {
        this.deselect(event.target.dataset.value);
        event.stopPropagation();
    }

    onToggleSelect(optionValue: any) {
        this.toggleSelect(optionValue);
    }

    onClose(focus: any) {
        this.close(focus);
    }

    onWindowClick() {
        this.close(false);
    }

    onWindowResize() {
        this.updateWidth();
    }

    onKeydown(event: any) {
        this.handleKeyDown(event);
    }

    onInput(event: any) {
        if (!this.isOpen) {
            this.open();
            // HACK
            setTimeout(() => {
                this.dropdown.filter(event.target.value);
            }, 100);
        }
        else {
            this.dropdown.filter(event.target.value);
        }
    }

    /***************************************************************************
     * Initialization.
     **************************************************************************/

    init() {
        this.initOptions();
        this.initDefaults();
    }

    initOptions() {
        let values: any[] = [];
        let opts = {};

        for (let option of this.options) {
            opts[option.value] = {
                value: option.value,
                label: option.label,
                selected: false
            };
            values.push(option.value);
        }

        this.optionValues = values;
        this.optionsDict = opts;
    }

    initDefaults() {
        if (typeof this.multiple === 'undefined') {
            this.multiple = false;
        }
        if (typeof this.theme === 'undefined') {
            this.theme = 'default';
        }
        if (typeof this.allowClear === 'undefined') {
            this.allowClear = false;
        }
    }

    /***************************************************************************
     * Dropdown toggle.
     **************************************************************************/

    toggleDropdown() {
        if (!this.isDisabled) {
            this.isOpen ? this.close(true) : this.open();
        }
    }

    open() {
        this.updateWidth();
        this.updatePosition();
        this.isOpen = true;
    }

    close(focus: boolean) {
        this.isOpen = false;
        if (focus) {
            this.focus();
        }
    }

    /***************************************************************************
     * Select.
     **************************************************************************/

    toggleSelect(value: string) {
        if (!this.multiple && this.selection.length > 0) {
            this.selection[0].selected = false;
        }
        this.optionsDict[value].selected = !this.optionsDict[value].selected;
        this.updateSelection();
        this.focus();
    }

    deselect(value: string) {
        this.optionsDict[value].selected = false;
        this.updateSelection();
    }

    updateSelection() {
        let s: Array<any> = [];
        let v: Array<string> = [];
        for (let optionValue of this.optionValues) {
            if (this.optionsDict[optionValue].selected) {
                let opt = this.optionsDict[optionValue];
                s.push(opt);
                v.push(opt.value);
            }
        }

        this.selection = s;
        this.value = v;

        // TODO first check if value has changed?
        this.onChange(this.getOutputValue());
    }

    clearSelected() {
        for (let item in this.optionsDict) {
            this.optionsDict[item].selected = false;
        }
        this.selection = [];
        this.value = [];

        // TODO first check if value has changed?
        this.onChange(this.getOutputValue());
    }

    getOutputValue(): any {
        if (this.multiple) {
            return this.value.slice(0);
        }
        else {
            return this.value.length === 0 ? '' : this.value[0];
        }
    }

    /***************************************************************************
     * ControlValueAccessor interface methods.
     **************************************************************************/

    writeValue(value: any) {

        if (typeof value === 'undefined' || value === null) {
            value = [];
        }

        this.value = value;

        // Populate `selection` and `value` arrays.
        for (let optionValue of value) {
            let option = this.optionsDict[optionValue];
            option.selected = true;
            this.selection.push(option);
        }
    }

    registerOnChange(fn: (_: any) => void) {
        this.onChange = fn;
    }

    registerOnTouched(fn: () => void) {
        this.onTouched = fn;
    }

    /***************************************************************************
     * Keys.
     **************************************************************************/

    private KEYS: any = {
        ENTER: 13,
        SPACE: 32,
        DOWN: 40
    };

    handleKeyDown(event: any) {

        let key = event.which;

        if (key === this.KEYS.ENTER || key === this.KEYS.SPACE ||
            (key === this.KEYS.DOWN && event.altKey)) {

            this.open();
            event.preventDefault();
        }
    }

    /***************************************************************************
     * Layout/Style/Classes/Focus.
     **************************************************************************/

    focus() {
        this.hasFocus = true;
        this.selectionSpan.nativeElement.focus();
    }

    blur() {
        this.hasFocus = false;
        this.selectionSpan.nativeElement.blur();
    }

    updateWidth() {
        this.width = this.container.nativeElement.offsetWidth;
    }

    updatePosition() {
        let e = this.container.nativeElement;
        this.left = e.offsetLeft;
        this.top = e.offsetTop + e.offsetHeight;
    }

    getContainerClass(): any {
        let result = {};

        result[this.S2] = true;

        let c = this.S2_CONTAINER;
        result[c] = true;
        result[c + '--open'] = this.isOpen;
        result[c + '--focus'] = this.hasFocus;
        result[c + '--' + this.theme] = true;
        result[c + '--' + (this.isBelow ? 'below' : 'above')] = true;

        return result;
    }

    getSelectionClass(): any {
        let result = {};

        let s = this.S2_SELECTION;
        result[s] = true;
        result[s + '--' + (this.multiple ? 'multiple' : 'single')] = true;

        return result;
    }

    showPlaceholder(): boolean {
        return typeof this.placeholder !== 'undefined' &&
            this.selection.length === 0;
    }

    getPlaceholder(): string {
        return this.showPlaceholder() ? this.placeholder : '';
    }

    multipleInputWidth(): any {
        return {
            width: '200px'
        };
    }
}

