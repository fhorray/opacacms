import { useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
import { $collections, $router, navigateTo } from 'opacacms';
import { useAdmin } from '../AdminProvider';
import { TextField } from './fields/TextField';
import { BooleanField } from './fields/BooleanField';

export function DocumentForm() {
  const page = useStore($router);
  const { client } = useAdmin();
  const collections = useStore($collections);
  const [formData, setFormData] = useState<Record<string, any>>({});

  const collection = page?.params?.collection;
  const id = page?.params?.id;
  const meta = collections.find((c) => c.slug === collection);
  const isEdit = id && id !== 'create';

  useEffect(() => {
    if (isEdit && collection) {
      client.findOne(collection, id).then(setFormData);
    }
  }, [collection, id]);

  const handleChange = (name: string, value: any) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collection) return;

    if (isEdit) {
      await client.update(collection, id, formData);
    } else {
      await client.create(collection, formData);
    }
    navigateTo(`/${collection}`);
  };

  if (!meta) return null;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">
        {isEdit ? `Edit ${meta.slug}` : `Create ${meta.slug}`}
      </h1>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        {meta.fields.map((field) => {
          switch (field.type) {
            case 'boolean':
              return (
                <BooleanField
                  key={field.name}
                  label={field.label}
                  name={field.name}
                  value={!!formData[field.name]}
                  onChange={handleChange}
                />
              );
            case 'text':
            case 'richtext':
            default:
              return (
                <TextField
                  key={field.name}
                  label={field.label}
                  name={field.name}
                  value={formData[field.name] ?? ''}
                  onChange={handleChange}
                  multiline={field.type === 'richtext'}
                />
              );
          }
        })}

        <div className="flex gap-3">
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded transition-colors"
          >
            {isEdit ? 'Update' : 'Create'}
          </button>
          <button
            type="button"
            onClick={() => navigateTo(`/${collection}`)}
            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
