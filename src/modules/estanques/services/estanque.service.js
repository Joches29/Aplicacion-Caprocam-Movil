import EstanqueLocalService from "./EstanqueLocal.service.js";

export const estanqueService = {
    getEstanques: async () => {
        return await EstanqueLocalService.getEstanques();
    },

    getEstanqueById: async (id) => {
        return await EstanqueLocalService.getEstanqueById(id);
    },
};

export default estanqueService;