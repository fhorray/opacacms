import { z } from 'zod';
import { getFieldMeta } from '../fields/utils';

// Helper to fully unwrap any wrapped schemas
function unwrapSchema(schema: z.ZodTypeAny): z.ZodTypeAny {
  let current = schema;
  while (true) {
    const def = (current as any)._def;
    if (def && def.innerType) {
      current = def.innerType;
    } else if (def && def.schema) {
      current = def.schema;
    } else {
      break;
    }
  }
  return current;
}

// Helper to escape HTML tags and quotes to prevent XSS/syntax issues
export function escapeHtml(str: unknown): string {
  if (str === undefined || str === null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Dynamically generates HTML inputs for a specific Zod schema field.
 * Handles nested objects (groups, accordions), arrays, relations, select fields, and primitive fields.
 */
export function renderFieldHtml(
  fieldName: string,
  schema: z.ZodTypeAny,
  value: unknown,
  errors: Record<string, string> | undefined,
  relationOptions: Record<string, { label: string; value: string }[]>
): string {
  const meta = getFieldMeta(schema);
  const unwrapped = unwrapSchema(schema);

  if (meta?.hidden) {
    return `<input type="hidden" name="${fieldName}" value="${escapeHtml(value ?? '')}" />`;
  }

  const labelText = meta?.label || fieldName;
  const isRequired = meta?.required;
  const isReadOnly = meta?.readOnly ? 'readonly' : '';
  const errorText = errors?.[fieldName] ? `<span class="field-error">${escapeHtml(errors[fieldName])}</span>` : '';
  const fieldType = meta?.fieldType || 'text';

  let inputHtml = '';

  // Handle accordion, group, row, and sidebar containers (which are nested objects in Zod)
  if (fieldType === 'group' || fieldType === 'accordion' || fieldType === 'row' || fieldType === 'sidebar') {
    const shape = meta?.shape || (unwrapped as any).shape || {};
    let childrenHtml = '';
    
    if (fieldType === 'row') {
      for (const key of Object.keys(shape)) {
        const childName = fieldName ? `${fieldName}.${key}` : key;
        const childValue = (value as Record<string, unknown> | undefined)?.[key];
        childrenHtml += `
          <div class="form-row-item">
            ${renderFieldHtml(childName, shape[key], childValue, errors, relationOptions)}
          </div>
        `;
      }
      return `
        <div class="form-row-container">
          ${childrenHtml}
        </div>
      `;
    }

    for (const key of Object.keys(shape)) {
      const childName = fieldName ? `${fieldName}.${key}` : key;
      const childValue = (value as Record<string, unknown> | undefined)?.[key];
      childrenHtml += renderFieldHtml(childName, shape[key], childValue, errors, relationOptions);
    }

    if (fieldType === 'group') {
      return `
        <fieldset class="group-fieldset">
          <legend>${escapeHtml(labelText)}</legend>
          ${childrenHtml}
        </fieldset>
      `;
    } else if (fieldType === 'accordion') {
      return `
        <details class="accordion-details">
          <summary class="accordion-summary">${escapeHtml(labelText)}</summary>
          <div class="accordion-content">
            ${childrenHtml}
          </div>
        </details>
      `;
    } else { // fieldType === 'sidebar'
      return `
        <div class="sidebar-container-box">
          ${labelText ? `<h3 class="sidebar-container-title">${escapeHtml(labelText)}</h3>` : ''}
          <div class="sidebar-container-content">
            ${childrenHtml}
          </div>
        </div>
      `;
    }
  }

  // Handle tabs layout visual container
  if (fieldType === 'tabs') {
    const tabsShape = meta?.tabsShape || {};
    const tabsKeys = Object.keys(tabsShape);
    if (tabsKeys.length === 0) return '';

    const uniqueId = `tabs-${fieldName.replace(/\./g, '-')}-${Math.random().toString(36).substring(2, 9)}`;

    let headersHtml = '';
    let contentsHtml = '';

    tabsKeys.forEach((tabKey, index) => {
      const tabLabel = tabKey.charAt(0).toUpperCase() + tabKey.slice(1);
      const isActive = index === 0 ? 'active' : '';
      const isVisibleStyle = index === 0 ? 'display: block;' : 'display: none;';

      headersHtml += `
        <button type="button" class="tab-btn ${isActive}" data-tab="${tabKey}" onclick="switchTab(this, '${uniqueId}', '${tabKey}')">
          ${escapeHtml(tabLabel)}
        </button>
      `;

      const tabFields = tabsShape[tabKey];
      let tabFieldsHtml = '';
      for (const key of Object.keys(tabFields)) {
        const childName = fieldName ? `${fieldName}.${tabKey}.${key}` : `${tabKey}.${key}`;
        const childValue = (value as Record<string, any> | undefined)?.[tabKey]?.[key];
        tabFieldsHtml += renderFieldHtml(childName, tabFields[key], childValue, errors, relationOptions);
      }

      contentsHtml += `
        <div class="tab-content ${isActive}" data-tab-content="${tabKey}" style="${isVisibleStyle}">
          ${tabFieldsHtml}
        </div>
      `;
    });

    return `
      <div class="tabs-container" id="${uniqueId}">
        <div class="tabs-header">
          ${headersHtml}
        </div>
        <div class="tabs-body">
          ${contentsHtml}
        </div>
      </div>
    `;
  }

  // Handle arrays (repeatable blocks of rows)
  if (fieldType === 'array') {
    const shape = meta?.shape || {};
    const arrayValues = Array.isArray(value) ? value : [];
    
    // Always render at least 1 empty row for user input convenience if none exist
    const rowCount = Math.max(arrayValues.length, 1);
    let rowsHtml = '';

    for (let i = 0; i < rowCount; i++) {
      const rowVal = arrayValues[i] || {};
      let rowFieldsHtml = '';
      for (const key of Object.keys(shape)) {
        const subName = `${fieldName}.${i}.${key}`;
        rowFieldsHtml += renderFieldHtml(subName, shape[key], rowVal[key], errors, relationOptions);
      }

      rowsHtml += `
        <div class="array-row" data-index="${i}" style="border: 1px solid var(--border-color); padding: 16px; margin-bottom: 12px; background-color: rgba(255,255,255,0.02); position: relative;">
          ${rowFieldsHtml}
          <button type="button" class="btn btn-danger btn-sm delete-row-btn" onclick="this.closest('.array-row').remove()" style="margin-top: 8px;">Remove Row</button>
        </div>
      `;
    }

    // Template row with placeholder INDEX for cloning client-side
    let templateRowHtml = '';
    for (const key of Object.keys(shape)) {
      const subName = `${fieldName}.__INDEX__.${key}`;
      templateRowHtml += renderFieldHtml(subName, shape[key], undefined, undefined, relationOptions);
    }

    return `
      <div class="form-group array-field-container" data-field="${fieldName}">
        <label style="font-weight: 600; margin-bottom: 8px; display: block;">${escapeHtml(labelText)}</label>
        <div class="array-rows" id="array-rows-${fieldName}">
          ${rowsHtml}
        </div>
        <button type="button" class="btn btn-secondary" onclick="addArrayRow('${fieldName}')" style="margin-top: 8px; width: fit-content;">Add Row</button>
        <template id="template-${fieldName}">
          <div class="array-row" data-index="__INDEX__" style="border: 1px solid var(--border-color); padding: 16px; margin-bottom: 12px; background-color: rgba(255,255,255,0.02); position: relative;">
            ${templateRowHtml}
            <button type="button" class="btn btn-danger btn-sm delete-row-btn" onclick="this.closest('.array-row').remove()" style="margin-top: 8px;">Remove Row</button>
          </div>
        </template>
        ${errorText}
      </div>
    `;
  }
  // Handle blocks layout matrix field
  if (fieldType === 'blocks') {
    const blocksList = meta?.blocks || [];
    const arrayValues = Array.isArray(value) ? value : [];
    const rowCount = arrayValues.length;
    let rowsHtml = '';

    for (let i = 0; i < rowCount; i++) {
      const rowVal = arrayValues[i] || {};
      const currentBlockType = rowVal.blockType || '';
      
      const blockConfig = blocksList.find((b: any) => b.slug === currentBlockType);
      let blockFieldsHtml = '';
      if (blockConfig) {
        const shape = blockConfig.schema.shape || {};
        for (const key of Object.keys(shape)) {
          const subName = `${fieldName}.${i}.blockData.${key}`;
          const childValue = rowVal.blockData?.[key];
          blockFieldsHtml += renderFieldHtml(subName, shape[key], childValue, errors, relationOptions);
        }
      }

      rowsHtml += `
        <div class="array-row block-row" data-index="${i}" style="border: 1px solid var(--border-color); padding: 16px; margin-bottom: 12px; background-color: rgba(255,255,255,0.02); position: relative;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px dashed var(--border-color); padding-bottom: 8px;">
            <strong style="text-transform: uppercase; font-size: 12px; letter-spacing: 1px;">Block: ${escapeHtml(blockConfig?.label || currentBlockType)}</strong>
            <input type="hidden" name="${fieldName}.${i}.blockType" value="${escapeHtml(currentBlockType)}" />
          </div>
          ${blockFieldsHtml}
          <button type="button" class="btn btn-danger btn-sm delete-row-btn" onclick="this.closest('.array-row').remove()" style="margin-top: 8px;">Remove Block</button>
        </div>
      `;
    }

    let templatesHtml = '';
    for (const b of blocksList) {
      let blockFieldsHtml = '';
      const shape = b.schema.shape || {};
      for (const key of Object.keys(shape)) {
        const subName = `${fieldName}.__INDEX__.blockData.${key}`;
        blockFieldsHtml += renderFieldHtml(subName, shape[key], undefined, undefined, relationOptions);
      }

      templatesHtml += `
        <template id="template-${fieldName}-${b.slug}">
          <div class="array-row block-row" data-index="__INDEX__" style="border: 1px solid var(--border-color); padding: 16px; margin-bottom: 12px; background-color: rgba(255,255,255,0.02); position: relative;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px dashed var(--border-color); padding-bottom: 8px;">
              <strong style="text-transform: uppercase; font-size: 12px; letter-spacing: 1px;">Block: ${escapeHtml(b.label || b.slug)}</strong>
              <input type="hidden" name="${fieldName}.__INDEX__.blockType" value="${escapeHtml(b.slug)}" />
            </div>
            ${blockFieldsHtml}
            <button type="button" class="btn btn-danger btn-sm delete-row-btn" onclick="this.closest('.array-row').remove()" style="margin-top: 8px;">Remove Block</button>
          </div>
        </template>
      `;
    }

    let blockOptionsHtml = '';
    for (const b of blocksList) {
      blockOptionsHtml += `<option value="${escapeHtml(b.slug)}">${escapeHtml(b.label || b.slug)}</option>`;
    }

    return `
      <div class="form-group array-field-container blocks-field-container" data-field="${fieldName}">
        <label style="font-weight: 600; margin-bottom: 8px; display: block;">${escapeHtml(labelText)}</label>
        <div class="array-rows" id="array-rows-${fieldName}">
          ${rowsHtml}
        </div>
        <div style="display: flex; gap: 8px; margin-top: 12px; align-items: center;">
          <select id="select-block-${fieldName}" class="form-select" style="width: auto; background-color: var(--background-color); border: 1px solid var(--border-color); color: var(--text-color); padding: 6px 12px; border-radius: 4px;">
            ${blockOptionsHtml}
          </select>
          <button type="button" class="btn btn-secondary" onclick="addBlockRow('${fieldName}')">Add Block</button>
        </div>
        ${templatesHtml}
        ${errorText}
      </div>
    `;
  }

  // Handle single checkbox field
  if (fieldType === 'checkbox') {
    const checked = value === true || value === 'true' || value === 'on' ? 'checked' : '';
    return `
      <div class="form-group checkbox-group">
        <input type="checkbox" id="field-${fieldName}" name="${fieldName}" ${checked} ${isReadOnly} />
        <label for="field-${fieldName}">${escapeHtml(labelText)}</label>
        ${errorText}
      </div>
    `;
  }

  // Handle text, date, numbers, selects, and relations
  const placeholderAttr = meta?.placeholder ? `placeholder="${escapeHtml(meta.placeholder)}"` : '';
  const requiredAttr = isRequired ? 'required' : '';

  if (fieldType === 'textarea') {
    inputHtml = `<textarea name="${fieldName}" ${placeholderAttr} ${requiredAttr} ${isReadOnly}>${escapeHtml(value ?? '')}</textarea>`;
  } else if (fieldType === 'richtext') {
    const escapedValue = escapeHtml(value ?? '');
    inputHtml = `
      <div class="tiptap-editor-container" data-field-name="${fieldName}">
        <div class="tiptap-toolbar">
          <button type="button" class="tiptap-btn" data-action="bold" title="Bold"><i data-lucide="bold"></i></button>
          <button type="button" class="tiptap-btn" data-action="italic" title="Italic"><i data-lucide="italic"></i></button>
          <button type="button" class="tiptap-btn" data-action="strike" title="Strike"><i data-lucide="strikethrough"></i></button>
          <span class="tiptap-divider"></span>
          <button type="button" class="tiptap-btn" data-action="h1" title="Heading 1"><i data-lucide="heading-1"></i></button>
          <button type="button" class="tiptap-btn" data-action="h2" title="Heading 2"><i data-lucide="heading-2"></i></button>
          <button type="button" class="tiptap-btn" data-action="h3" title="Heading 3"><i data-lucide="heading-3"></i></button>
          <span class="tiptap-divider"></span>
          <button type="button" class="tiptap-btn" data-action="bulletList" title="Bullet List"><i data-lucide="list"></i></button>
          <button type="button" class="tiptap-btn" data-action="orderedList" title="Ordered List"><i data-lucide="list-ordered"></i></button>
          <span class="tiptap-divider"></span>
          <button type="button" class="tiptap-btn" data-action="blockquote" title="Blockquote"><i data-lucide="quote"></i></button>
          <button type="button" class="tiptap-btn" data-action="codeBlock" title="Code Block"><i data-lucide="code"></i></button>
          <span class="tiptap-divider"></span>
          <button type="button" class="tiptap-btn" data-action="undo" title="Undo"><i data-lucide="undo-2"></i></button>
          <button type="button" class="tiptap-btn" data-action="redo" title="Redo"><i data-lucide="redo-2"></i></button>
        </div>
        <div class="tiptap-editor" id="tiptap-editor-${fieldName}"></div>
        <textarea name="${fieldName}" id="tiptap-input-${fieldName}" style="display: none;">${escapedValue}</textarea>
      </div>
    `;
  } else if (fieldType === 'select') {
    const options = meta?.options || [];
    let optionsHtml = '';
    if (!isRequired) {
      optionsHtml += `<option value="">Select...</option>`;
    }
    for (const opt of options) {
      const optVal = typeof opt === 'string' ? opt : opt.value;
      const optLabel = typeof opt === 'string' ? opt : opt.label;
      const selected = String(value) === String(optVal) ? 'selected' : '';
      optionsHtml += `<option value="${escapeHtml(optVal)}" ${selected}>${escapeHtml(optLabel)}</option>`;
    }
    inputHtml = `<select name="${fieldName}" ${requiredAttr} ${isReadOnly}>${optionsHtml}</select>`;
  } else if (fieldType === 'multiselect') {
    const options = meta?.options || [];
    if (meta?.style === 'select') {
      let optionsHtml = '';
      for (const opt of options) {
        const optVal = typeof opt === 'string' ? opt : opt.value;
        const optLabel = typeof opt === 'string' ? opt : opt.label;
        const isSelected = Array.isArray(value)
          ? value.some(val => String(val) === String(optVal))
          : String(value) === String(optVal);
        const selectedAttr = isSelected ? 'selected' : '';
        optionsHtml += `<option value="${escapeHtml(optVal)}" ${selectedAttr}>${escapeHtml(optLabel)}</option>`;
      }
      inputHtml = `<select name="${fieldName}" multiple style="min-height: 120px;" ${requiredAttr} ${isReadOnly}>${optionsHtml}</select>`;
    } else {
      let checkboxesHtml = '';
      for (const opt of options) {
        const optVal = typeof opt === 'string' ? opt : opt.value;
        const optLabel = typeof opt === 'string' ? opt : opt.label;
        const isChecked = Array.isArray(value)
          ? value.some(val => String(val) === String(optVal))
          : String(value) === String(optVal);
        const checkedAttr = isChecked ? 'checked' : '';
        checkboxesHtml += `
          <label class="multiselect-checkbox-label" style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; cursor: pointer;">
            <input type="checkbox" name="${fieldName}" value="${escapeHtml(optVal)}" ${checkedAttr} ${isReadOnly ? 'disabled' : ''} style="margin: 0;" />
            <span>${escapeHtml(optLabel)}</span>
          </label>
        `;
      }
      inputHtml = `
        <div class="multiselect-checkbox-box" style="border: 1px solid var(--border-color); padding: 12px; border-radius: 4px; background-color: rgba(255,255,255,0.01); max-height: 200px; overflow-y: auto;">
          ${checkboxesHtml}
        </div>
      `;
    }
  } else if (fieldType === 'relation') {
    const relationSlug = meta?.collection || '';
    const options = relationOptions[relationSlug] || [];
    const hasMany = meta?.hasMany === true;
    let optionsHtml = '';
    if (!hasMany) {
      optionsHtml += `<option value="">Select relationship...</option>`;
    }
    for (const opt of options) {
      let isSelected = false;
      if (hasMany) {
        isSelected = Array.isArray(value) 
          ? value.some(val => String(val) === String(opt.value))
          : String(value) === String(opt.value);
      } else {
        isSelected = String(value) === String(opt.value);
      }
      const selectedAttr = isSelected ? 'selected' : '';
      optionsHtml += `<option value="${escapeHtml(opt.value)}" ${selectedAttr}>${escapeHtml(opt.label)}</option>`;
    }
    const multipleAttr = hasMany ? 'multiple style="min-height: 120px;"' : '';
    inputHtml = `<select name="${fieldName}" ${multipleAttr} ${requiredAttr} ${isReadOnly}>${optionsHtml}</select>`;
  } else if (fieldType === 'number') {
    inputHtml = `<input type="number" name="${fieldName}" value="${value !== undefined && value !== null ? escapeHtml(String(value)) : ''}" ${placeholderAttr} ${requiredAttr} ${isReadOnly} />`;
  } else if (fieldType === 'date') {
    inputHtml = `<input type="date" name="${fieldName}" value="${value !== undefined && value !== null ? escapeHtml(String(value)) : ''}" ${requiredAttr} ${isReadOnly} />`;
  } else {
    // text/fallback input
    inputHtml = `<input type="text" name="${fieldName}" value="${value !== undefined && value !== null ? escapeHtml(String(value)) : ''}" ${placeholderAttr} ${requiredAttr} ${isReadOnly} />`;
  }

  return `
    <div class="form-group">
      <label class="${isRequired ? 'required' : ''}">${escapeHtml(labelText)}</label>
      ${inputHtml}
      ${errorText}
    </div>
  `;
}
