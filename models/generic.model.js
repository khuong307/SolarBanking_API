import db from '../utils/db.js';

export default function (tableName, idField) {
    return {
        findAll() {
            return db(tableName);
        },

        add(entity) {
            return db(tableName).insert(entity);
        },

        update(entity){
            const id = entity[idField]
            delete entity[idField]
            return db(tableName).where(idField, id).update(entity)
        },

        delete(id){
            return db(tableName).where(idField, id).del()
        },

        async findById(id){
            const ans = await db(tableName).where(idField, id).select()
            return ans.length > 0? ans[0]: null
        },

        async isExist(id){
            const ans = await db(tableName).where(idField, id)
            return ans.length == 0? false: true
        },
        async isExistedByCol(col, value){
            const ans = await db(tableName).where(col,value)
            return ans.length == 0? false: true
        },
        async findByCol(col, value){
            const ans = await db(tableName).where(col,value)
            return ans.length == 0? null: ans[0]
        }
    }
}